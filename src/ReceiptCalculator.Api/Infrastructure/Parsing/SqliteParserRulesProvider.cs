using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Options;

namespace ReceiptCalculator.Api.Infrastructure.Parsing;

public sealed class SqliteParserRulesProvider : IParserRulesProvider
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false,
    };

    private readonly string _connectionString;
    private readonly SemaphoreSlim _initLock = new(1, 1);
    private bool _initialized;
    private ParserRulesActiveSnapshot? _cachedSnapshot;

    public SqliteParserRulesProvider(IOptions<ParserRulesOptions> options, IWebHostEnvironment env)
    {
        var path = options.Value.SqlitePath;
        if (!Path.IsPathRooted(path))
            path = Path.Combine(env.ContentRootPath, path);

        var dir = Path.GetDirectoryName(path);
        if (!string.IsNullOrEmpty(dir))
            Directory.CreateDirectory(dir);

        _connectionString = new SqliteConnectionStringBuilder { DataSource = path, Mode = SqliteOpenMode.ReadWriteCreate }
            .ToString();
    }

    public ParserRuleSet GetRules()
    {
        EnsureInitialized();
        return _cachedSnapshot!.Rules;
    }

    public ParserRulesActiveSnapshot GetActiveSnapshot()
    {
        EnsureInitialized();
        return _cachedSnapshot!;
    }

    private void EnsureInitialized()
    {
        if (_initialized) return;
        _initLock.Wait();
        try
        {
            if (_initialized) return;

            using var conn = new SqliteConnection(_connectionString);
            conn.Open();

            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = """
                    CREATE TABLE IF NOT EXISTS ParserRules (
                      Id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                      Version INTEGER NOT NULL,
                      PayloadJson TEXT NOT NULL,
                      CreatedAtUtc TEXT NOT NULL,
                      IsActive INTEGER NOT NULL CHECK (IsActive IN (0, 1)),
                      Remark TEXT NOT NULL DEFAULT ''
                    );
                    """;
                cmd.ExecuteNonQuery();
            }

            EnsureRemarkColumn(conn);

            using (var countCmd = conn.CreateCommand())
            {
                countCmd.CommandText = "SELECT COUNT(*) FROM ParserRules;";
                var count = Convert.ToInt64(countCmd.ExecuteScalar() ?? 0L);
                if (count == 0)
                {
                    var defaults = ParserRuleSet.CreateDefault();
                    var json = JsonSerializer.Serialize(defaults, JsonOptions);
                    using var ins = conn.CreateCommand();
                    ins.CommandText = """
                        INSERT INTO ParserRules (Version, PayloadJson, CreatedAtUtc, IsActive, Remark)
                        VALUES ($v, $j, $c, 1, $r);
                        """;
                    ins.Parameters.AddWithValue("$v", defaults.Version);
                    ins.Parameters.AddWithValue("$j", json);
                    ins.Parameters.AddWithValue("$c", DateTime.UtcNow.ToString("o", CultureInfo.InvariantCulture));
                    ins.Parameters.AddWithValue("$r", string.Empty);
                    ins.ExecuteNonQuery();
                }
            }

            int id;
            int version;
            string payload;
            string remark;
            DateTimeOffset createdAt;
            using (var sel = conn.CreateCommand())
            {
                sel.CommandText = """
                    SELECT Id, Version, PayloadJson, Remark, CreatedAtUtc FROM ParserRules
                    WHERE IsActive = 1
                    LIMIT 1;
                    """;
                using var reader = sel.ExecuteReader();
                if (!reader.Read())
                {
                    throw new InvalidOperationException("ParserRules has no active row.");
                }

                id = reader.GetInt32(0);
                version = reader.GetInt32(1);
                payload = reader.GetString(2);
                remark = reader.IsDBNull(3) ? string.Empty : reader.GetString(3);
                var createdRaw = reader.GetString(4);
                createdAt = DateTimeOffset.TryParse(createdRaw, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var dto)
                    ? dto
                    : DateTimeOffset.UtcNow;
            }

            if (version < ParserRuleSet.CurrentSchemaVersion)
            {
                var fresh = ParserRuleSet.CreateDefault();
                payload = JsonSerializer.Serialize(fresh, JsonOptions);
                version = fresh.Version;
                using var up = conn.CreateCommand();
                up.CommandText = """
                    UPDATE ParserRules
                    SET Version = $v, PayloadJson = $j, Remark = $r
                    WHERE Id = $id;
                    """;
                up.Parameters.AddWithValue("$v", version);
                up.Parameters.AddWithValue("$j", payload);
                var newRemark = string.IsNullOrWhiteSpace(remark)
                    ? $"schema v{ParserRuleSet.CurrentSchemaVersion} (auto-migrated)"
                    : $"{remark} | migrated to schema v{ParserRuleSet.CurrentSchemaVersion}";
                up.Parameters.AddWithValue("$r", newRemark);
                up.Parameters.AddWithValue("$id", id);
                up.ExecuteNonQuery();
                remark = newRemark;
            }

            var rules = JsonSerializer.Deserialize<ParserRuleSet>(payload, JsonOptions)
                ?? throw new InvalidOperationException("ParserRules PayloadJson deserialized to null.");

            try
            {
                _ = new Regex(rules.AmountLinePattern, RegexOptions.Compiled);
            }
            catch (ArgumentException ex)
            {
                throw new InvalidOperationException(
                    $"Parser rules AmountLinePattern is not a valid regular expression: {rules.AmountLinePattern}",
                    ex);
            }

            _cachedSnapshot = new ParserRulesActiveSnapshot
            {
                Id = id,
                Version = version,
                Remark = remark,
                CreatedAtUtc = createdAt,
                Rules = rules,
            };
            _initialized = true;
        }
        finally
        {
            _initLock.Release();
        }
    }

    /// <summary>
    /// Existing DBs created before <c>Remark</c> existed get the column added (empty string default).
    /// </summary>
    private static void EnsureRemarkColumn(SqliteConnection conn)
    {
        using var cmd = conn.CreateCommand();
        cmd.CommandText = "PRAGMA table_info(ParserRules);";
        using var reader = cmd.ExecuteReader();
        while (reader.Read())
        {
            var colName = reader.GetString(1);
            if (string.Equals(colName, "Remark", StringComparison.OrdinalIgnoreCase))
            {
                return;
            }
        }

        reader.Close();
        using var alter = conn.CreateCommand();
        alter.CommandText = "ALTER TABLE ParserRules ADD COLUMN Remark TEXT NOT NULL DEFAULT '';";
        alter.ExecuteNonQuery();
    }
}
