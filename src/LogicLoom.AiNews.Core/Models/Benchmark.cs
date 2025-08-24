namespace LogicLoom.AiNews.Core.Models;

public class Benchmark
{
    public int Id { get; set; }
    public int ModelId { get; set; }
    public AIModel? Model { get; set; }
    public string TestName { get; set; } = string.Empty;
    public decimal Score { get; set; }
    public string Unit { get; set; } = string.Empty;
    public DateTime TestDate { get; set; }
    public string Description { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
