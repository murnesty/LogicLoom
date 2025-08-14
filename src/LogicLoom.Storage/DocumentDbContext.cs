using Microsoft.EntityFrameworkCore;
using LogicLoom.DocumentProcessor.Models;
using Newtonsoft.Json;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace LogicLoom.Storage;

public class DocumentDbContext : DbContext
{
    public DocumentDbContext(DbContextOptions<DocumentDbContext> options)
        : base(options)
    {
    }

    public DbSet<DocumentNode> Nodes { get; set; }
    public DbSet<NodeRelationship> Relationships { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var dictionaryConverter = new ValueConverter<Dictionary<string, string>, string>(
            v => JsonConvert.SerializeObject(v),
            v => JsonConvert.DeserializeObject<Dictionary<string, string>>(v) ?? new Dictionary<string, string>()
        );

        modelBuilder.Entity<DocumentNode>(entity =>
        {
            entity.ToTable("Nodes");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Type).IsRequired();
            entity.Property(e => e.Content).IsRequired();
        });

        modelBuilder.Entity<NodeRelationship>(entity =>
        {
            entity.ToTable("Relationships");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Type).IsRequired();
            entity.Property(e => e.Properties)
                .HasConversion(dictionaryConverter)
                .HasColumnType("jsonb");
        });
    }
}
