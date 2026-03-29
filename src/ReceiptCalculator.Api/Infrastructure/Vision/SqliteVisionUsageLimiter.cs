using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Options;

namespace ReceiptCalculator.Api.Infrastructure.Vision;

/// <summary>
/// Global SQLite counters (UTC day + UTC calendar month). Configured via <see cref="VisionOptions"/>.
/// </summary>
public sealed class SqliteVisionUsageLimiter
{
    private readonly string _connectionString;
    private readonly int _dailyLimit;
    private readonly int _monthlyLimit;
    private readonly SemaphoreSlim _initLock = new(1, 1);
    private bool _initialized;

    public SqliteVisionUsageLimiter(IOptions<VisionOptions> options, IWebHostEnvironment env)
    {
        var opt = options.Value;
        var path = opt.SqlitePath;
        if (!Path.IsPathRooted(path))
            path = Path.Combine(env.ContentRootPath, path);

        var dir = Path.GetDirectoryName(path);
        if (!string.IsNullOrEmpty(dir))
            Directory.CreateDirectory(dir);

        _connectionString = new SqliteConnectionStringBuilder { DataSource = path, Mode = SqliteOpenMode.ReadWriteCreate }
            .ToString();
        _dailyLimit = Math.Max(0, opt.DailyScanLimit);
        _monthlyLimit = Math.Max(0, opt.MonthlyScanLimit);
    }

    private async Task EnsureSchemaAsync(CancellationToken cancellationToken)
    {
        if (_initialized) return;
        await _initLock.WaitAsync(cancellationToken);
        try
        {
            if (_initialized) return;
            await using var conn = new SqliteConnection(_connectionString);
            await conn.OpenAsync(cancellationToken);
            await using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = """
                    CREATE TABLE IF NOT EXISTS VisionDailyUsage (
                      UtcDate TEXT NOT NULL PRIMARY KEY,
                      ScanCount INTEGER NOT NULL DEFAULT 0 CHECK (ScanCount >= 0)
                    );
                    """;
                await cmd.ExecuteNonQueryAsync(cancellationToken);
            }

            await using (var cmd2 = conn.CreateCommand())
            {
                cmd2.CommandText = """
                    CREATE TABLE IF NOT EXISTS VisionMonthlyUsage (
                      UtcYearMonth TEXT NOT NULL PRIMARY KEY,
                      ScanCount INTEGER NOT NULL DEFAULT 0 CHECK (ScanCount >= 0)
                    );
                    """;
                await cmd2.ExecuteNonQueryAsync(cancellationToken);
            }

            _initialized = true;
        }
        finally
        {
            _initLock.Release();
        }
    }

    /// <summary>
    /// Tries to consume <paramref name="count"/> scans. Both active limits must allow the increment.
    /// A limit of 0 means unlimited for that dimension.
    /// </summary>
    public async Task<VisionConsumeResult> TryConsumeAsync(int count, CancellationToken cancellationToken)
    {
        if (count <= 0)
        {
            return new VisionConsumeResult
            {
                Allowed = true,
                ScansUsedToday = 0,
                DailyLimit = _dailyLimit,
                ScansUsedThisMonth = 0,
                MonthlyLimit = _monthlyLimit,
            };
        }

        if (_dailyLimit <= 0 && _monthlyLimit <= 0)
        {
            return new VisionConsumeResult
            {
                Allowed = true,
                ScansUsedToday = 0,
                DailyLimit = 0,
                ScansUsedThisMonth = 0,
                MonthlyLimit = 0,
            };
        }

        await EnsureSchemaAsync(cancellationToken);
        var today = DateTime.UtcNow.ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);
        var yearMonth = DateTime.UtcNow.ToString("yyyy-MM", System.Globalization.CultureInfo.InvariantCulture);

        await using var conn = new SqliteConnection(_connectionString);
        await conn.OpenAsync(cancellationToken);

        await using var tx = (SqliteTransaction)await conn.BeginTransactionAsync(cancellationToken);
        try
        {
            await using (var insD = conn.CreateCommand())
            {
                insD.Transaction = tx;
                insD.CommandText = """
                    INSERT INTO VisionDailyUsage (UtcDate, ScanCount) VALUES ($d, 0)
                    ON CONFLICT(UtcDate) DO NOTHING;
                    """;
                insD.Parameters.AddWithValue("$d", today);
                await insD.ExecuteNonQueryAsync(cancellationToken);
            }

            await using (var insM = conn.CreateCommand())
            {
                insM.Transaction = tx;
                insM.CommandText = """
                    INSERT INTO VisionMonthlyUsage (UtcYearMonth, ScanCount) VALUES ($ym, 0)
                    ON CONFLICT(UtcYearMonth) DO NOTHING;
                    """;
                insM.Parameters.AddWithValue("$ym", yearMonth);
                await insM.ExecuteNonQueryAsync(cancellationToken);
            }

            int dailyUsed;
            await using (var readD = conn.CreateCommand())
            {
                readD.Transaction = tx;
                readD.CommandText = "SELECT ScanCount FROM VisionDailyUsage WHERE UtcDate = $d;";
                readD.Parameters.AddWithValue("$d", today);
                var o = await readD.ExecuteScalarAsync(cancellationToken);
                dailyUsed = o is long ld ? (int)ld : Convert.ToInt32(o ?? 0);
            }

            int monthlyUsed;
            await using (var readM = conn.CreateCommand())
            {
                readM.Transaction = tx;
                readM.CommandText = "SELECT ScanCount FROM VisionMonthlyUsage WHERE UtcYearMonth = $ym;";
                readM.Parameters.AddWithValue("$ym", yearMonth);
                var o = await readM.ExecuteScalarAsync(cancellationToken);
                monthlyUsed = o is long lm ? (int)lm : Convert.ToInt32(o ?? 0);
            }

            if (_dailyLimit > 0 && dailyUsed + count > _dailyLimit)
            {
                await tx.RollbackAsync(cancellationToken);
                return new VisionConsumeResult
                {
                    Allowed = false,
                    BlockedBy = "daily",
                    ScansUsedToday = dailyUsed,
                    DailyLimit = _dailyLimit,
                    ScansUsedThisMonth = monthlyUsed,
                    MonthlyLimit = _monthlyLimit,
                };
            }

            if (_monthlyLimit > 0 && monthlyUsed + count > _monthlyLimit)
            {
                await tx.RollbackAsync(cancellationToken);
                return new VisionConsumeResult
                {
                    Allowed = false,
                    BlockedBy = "monthly",
                    ScansUsedToday = dailyUsed,
                    DailyLimit = _dailyLimit,
                    ScansUsedThisMonth = monthlyUsed,
                    MonthlyLimit = _monthlyLimit,
                };
            }

            await using (var upD = conn.CreateCommand())
            {
                upD.Transaction = tx;
                upD.CommandText = "UPDATE VisionDailyUsage SET ScanCount = ScanCount + $n WHERE UtcDate = $d;";
                upD.Parameters.AddWithValue("$n", count);
                upD.Parameters.AddWithValue("$d", today);
                await upD.ExecuteNonQueryAsync(cancellationToken);
            }

            await using (var upM = conn.CreateCommand())
            {
                upM.Transaction = tx;
                upM.CommandText = "UPDATE VisionMonthlyUsage SET ScanCount = ScanCount + $n WHERE UtcYearMonth = $ym;";
                upM.Parameters.AddWithValue("$n", count);
                upM.Parameters.AddWithValue("$ym", yearMonth);
                await upM.ExecuteNonQueryAsync(cancellationToken);
            }

            await tx.CommitAsync(cancellationToken);

            return new VisionConsumeResult
            {
                Allowed = true,
                ScansUsedToday = dailyUsed + count,
                DailyLimit = _dailyLimit,
                ScansUsedThisMonth = monthlyUsed + count,
                MonthlyLimit = _monthlyLimit,
            };
        }
        catch
        {
            await tx.RollbackAsync(cancellationToken);
            throw;
        }
    }
}
