using Microsoft.EntityFrameworkCore;
using HistoryViewer.Api.Domain.Entities;

namespace HistoryViewer.Api.Infrastructure;

/// <summary>
/// Database context for History Viewer
/// </summary>
public class HistoryDbContext : DbContext
{
    public HistoryDbContext(DbContextOptions<HistoryDbContext> options) : base(options)
    {
    }

    public DbSet<Era> Eras => Set<Era>();
    public DbSet<Event> Events => Set<Event>();
    public DbSet<HistoricalFigure> HistoricalFigures => Set<HistoricalFigure>();
    public DbSet<Territory> Territories => Set<Territory>();
    public DbSet<Tag> Tags => Set<Tag>();
    public DbSet<EventTag> EventTags => Set<EventTag>();
    public DbSet<EventFigure> EventFigures => Set<EventFigure>();
    public DbSet<FigureRole> FigureRoles => Set<FigureRole>();
    public DbSet<SupportedLanguage> SupportedLanguages => Set<SupportedLanguage>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Era configuration
        modelBuilder.Entity<Era>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Civilization).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Color).HasMaxLength(7);
            entity.Property(e => e.NameI18n).HasColumnType("jsonb");
            entity.Property(e => e.DescriptionI18n).HasColumnType("jsonb");
            entity.HasIndex(e => e.StartYear);
            entity.HasIndex(e => e.Civilization);
        });

        // Event configuration
        modelBuilder.Entity<Event>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(500);
            entity.Property(e => e.Category).IsRequired().HasMaxLength(50);
            entity.Property(e => e.DatePrecision).HasMaxLength(20).HasDefaultValue("year");
            entity.Property(e => e.TitleI18n).HasColumnType("jsonb");
            entity.Property(e => e.DescriptionI18n).HasColumnType("jsonb");
            entity.HasIndex(e => new { e.StartYear, e.EndYear });
            entity.HasIndex(e => e.Category);
            entity.HasIndex(e => e.EraId);
            entity.HasIndex(e => e.Significance);
            entity.HasOne(e => e.Era)
                  .WithMany(era => era.Events)
                  .HasForeignKey(e => e.EraId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        // HistoricalFigure configuration
        modelBuilder.Entity<HistoricalFigure>(entity =>
        {
            entity.HasKey(f => f.Id);
            entity.Property(f => f.Name).IsRequired().HasMaxLength(200);
            entity.Property(f => f.NameI18n).HasColumnType("jsonb");
            entity.Property(f => f.BiographyI18n).HasColumnType("jsonb");
        });

        // Territory configuration
        modelBuilder.Entity<Territory>(entity =>
        {
            entity.HasKey(t => t.Id);
            entity.Property(t => t.Name).IsRequired().HasMaxLength(200);
            entity.Property(t => t.Civilization).IsRequired().HasMaxLength(50);
            entity.Property(t => t.Color).HasMaxLength(7);
            entity.Property(t => t.NameI18n).HasColumnType("jsonb");
            entity.Property(t => t.Boundaries).HasColumnType("jsonb");
            entity.HasIndex(t => t.Year);
            entity.HasOne(t => t.Era)
                  .WithMany(e => e.Territories)
                  .HasForeignKey(t => t.EraId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        // Tag configuration
        modelBuilder.Entity<Tag>(entity =>
        {
            entity.HasKey(t => t.Id);
            entity.Property(t => t.Name).IsRequired().HasMaxLength(100);
            entity.Property(t => t.Category).HasMaxLength(50);
            entity.Property(t => t.NameI18n).HasColumnType("jsonb");
        });

        // EventTag junction table
        modelBuilder.Entity<EventTag>(entity =>
        {
            entity.HasKey(et => new { et.EventId, et.TagId });
            entity.HasOne(et => et.Event)
                  .WithMany(e => e.EventTags)
                  .HasForeignKey(et => et.EventId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(et => et.Tag)
                  .WithMany(t => t.EventTags)
                  .HasForeignKey(et => et.TagId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // EventFigure junction table
        modelBuilder.Entity<EventFigure>(entity =>
        {
            entity.HasKey(ef => new { ef.EventId, ef.FigureId });
            entity.Property(ef => ef.Role).HasMaxLength(50);
            entity.HasOne(ef => ef.Event)
                  .WithMany(e => e.EventFigures)
                  .HasForeignKey(ef => ef.EventId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(ef => ef.Figure)
                  .WithMany(f => f.EventFigures)
                  .HasForeignKey(ef => ef.FigureId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // FigureRole configuration
        modelBuilder.Entity<FigureRole>(entity =>
        {
            entity.HasKey(fr => fr.Id);
            entity.Property(fr => fr.Role).IsRequired().HasMaxLength(50);
            entity.Property(fr => fr.TitleEn).HasMaxLength(200);
            entity.Property(fr => fr.TitleZh).HasMaxLength(200);
            entity.HasOne(fr => fr.Figure)
                  .WithMany(f => f.Roles)
                  .HasForeignKey(fr => fr.FigureId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(fr => fr.Era)
                  .WithMany()
                  .HasForeignKey(fr => fr.EraId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        // SupportedLanguage configuration
        modelBuilder.Entity<SupportedLanguage>(entity =>
        {
            entity.HasKey(l => l.Id);
            entity.Property(l => l.Code).IsRequired().HasMaxLength(10);
            entity.Property(l => l.NameNative).IsRequired().HasMaxLength(50);
            entity.Property(l => l.NameEn).IsRequired().HasMaxLength(50);
            entity.HasIndex(l => l.Code).IsUnique();
        });
    }
}
