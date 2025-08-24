using LogicLoom.AiNews.Core.Models;
using Microsoft.EntityFrameworkCore;

namespace LogicLoom.AiNews.Api.Data;

public class AiNewsDbContext : DbContext
{
    public AiNewsDbContext(DbContextOptions<AiNewsDbContext> options) : base(options) { }

    public DbSet<AIModel> AIModels { get; set; }
    public DbSet<NewsArticle> NewsArticles { get; set; }
    public DbSet<Benchmark> Benchmarks { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // AIModel configuration
        modelBuilder.Entity<AIModel>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Company).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Version).HasMaxLength(50);
            entity.Property(e => e.Description).HasMaxLength(2000);
            entity.Property(e => e.ContextWindow).HasMaxLength(100);
            entity.Property(e => e.Pricing).HasMaxLength(500);
            entity.Property(e => e.Capabilities)
                .HasConversion(
                    v => string.Join(',', v),
                    v => v.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList());

            // Configure DateTime properties for PostgreSQL
            entity.Property(e => e.ReleaseDate)
                .HasColumnType("timestamp with time zone");
            entity.Property(e => e.CreatedAt)
                .HasColumnType("timestamp with time zone");
        });

        // NewsArticle configuration
        modelBuilder.Entity<NewsArticle>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(500);
            entity.Property(e => e.Source).IsRequired().HasMaxLength(200);
            entity.Property(e => e.SourceUrl).HasMaxLength(1000);
            entity.Property(e => e.Category).HasMaxLength(100);
            entity.Property(e => e.Summary).HasMaxLength(2000);
            entity.Property(e => e.Tags)
                .HasConversion(
                    v => string.Join(',', v),
                    v => v.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList());

            // Configure DateTime properties for PostgreSQL
            entity.Property(e => e.PublishDate)
                .HasColumnType("timestamp with time zone");
            entity.Property(e => e.CreatedAt)
                .HasColumnType("timestamp with time zone");
        });

        // Benchmark configuration
        modelBuilder.Entity<Benchmark>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.TestName).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Unit).HasMaxLength(50);
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.HasOne(e => e.Model)
                .WithMany()
                .HasForeignKey(e => e.ModelId);
        });

        base.OnModelCreating(modelBuilder);
    }
}
