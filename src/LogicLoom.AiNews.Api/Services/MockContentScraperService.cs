using LogicLoom.AiNews.Core.Interfaces;
using LogicLoom.AiNews.Core.Models;

namespace LogicLoom.AiNews.Api.Services;

public class MockContentScraperService : IContentScraperService
{
    public async Task<List<NewsArticle>> ScrapeLatestNewsAsync()
    {
        // Simulate async operation
        await Task.Delay(100);

        return new List<NewsArticle>
        {
            new NewsArticle
            {
                Title = "OpenAI Announces GPT-5.0 with Revolutionary AI Capabilities",
                Content = "OpenAI has released GPT-5.0, the most advanced version of their flagship model that brings groundbreaking improvements in reasoning, multimodal processing, and efficiency. The model features enhanced logical reasoning, scientific problem-solving capabilities, and significantly reduced computational costs. Key features include real-time multimodal interaction, advanced mathematical reasoning, improved code generation, and state-of-the-art safety measures. GPT-5.0 demonstrates superior performance across all benchmarks while offering 60% cost reduction compared to previous models.",
                Source = "OpenAI Blog",
                SourceUrl = "https://openai.com/blog/gpt-5-announcement",
                PublishDate = DateTime.UtcNow.AddDays(-1),
                Category = "Model Release",
                Summary = "OpenAI releases GPT-5.0 with revolutionary AI capabilities and 60% cost reduction",
                Tags = new List<string> { "OpenAI", "GPT-5.0", "Advanced Reasoning", "Cost Reduction", "Multimodal" }
            },
            new NewsArticle
            {
                Title = "Anthropic's Claude 3.5 Sonnet Achieves New Benchmarks in Code Generation",
                Content = "Anthropic has announced Claude 3.5 Sonnet, which shows remarkable improvements in code generation and analysis tasks. The model features a 200K context window and enhanced safety measures through constitutional AI. Benchmark results show significant improvements in coding tasks, with particular strength in debugging and code explanation. The model also introduces artifact creation capabilities, allowing users to generate and modify code snippets interactively.",
                Source = "Anthropic Blog",
                SourceUrl = "https://anthropic.com/blog/claude-3-5-sonnet",
                PublishDate = DateTime.UtcNow.AddDays(-5),
                Category = "Model Release",
                Summary = "Claude 3.5 Sonnet shows improvements in code generation with 200K context window",
                Tags = new List<string> { "Anthropic", "Claude", "Code Generation", "Safety" }
            },
            new NewsArticle
            {
                Title = "DeepSeek V2.5 Open-Source Model Challenges Proprietary Solutions",
                Content = "DeepSeek has released V2.5 of their open-source language model, demonstrating competitive performance against proprietary solutions at a fraction of the cost. The model utilizes a Mixture of Experts (MoE) architecture and shows particular strength in mathematics and coding tasks. Being open-source, it allows for customization and self-hosting, making it an attractive option for organizations concerned about data privacy and costs.",
                Source = "DeepSeek Research",
                SourceUrl = "https://deepseek.com/blog/v2-5-release",
                PublishDate = DateTime.UtcNow.AddDays(-7),
                Category = "Research",
                Summary = "DeepSeek V2.5 offers competitive open-source alternative with strong STEM capabilities",
                Tags = new List<string> { "DeepSeek", "Open Source", "Mathematics", "MoE" }
            },
            new NewsArticle
            {
                Title = "Google's Gemini 2.0 Introduces 2M Token Context Window",
                Content = "Google has unveiled Gemini 2.0, featuring an unprecedented 2 million token context window that enables processing of extremely long documents and conversations. The model maintains Google's focus on factual accuracy and integrates seamlessly with Google's ecosystem of services. Native multimodal architecture allows for sophisticated reasoning across different input types, making it particularly effective for research and analysis tasks.",
                Source = "Google AI Blog",
                SourceUrl = "https://ai.googleblog.com/gemini-2-0-announcement",
                PublishDate = DateTime.UtcNow.AddDays(-10),
                Category = "Model Release",
                Summary = "Gemini 2.0 features 2M token context window and native multimodal architecture",
                Tags = new List<string> { "Google", "Gemini", "Context Window", "Multimodal" }
            }
        };
    }

    public async Task<List<AIModel>> ScrapeModelReleasesAsync()
    {
        // Simulate async operation
        await Task.Delay(100);

        return new List<AIModel>
        {
            new AIModel
            {
                Name = "GPT-5.0",
                Version = "5.0",
                Company = "OpenAI",
                ReleaseDate = new DateTime(2024, 12, 15, 0, 0, 0, DateTimeKind.Utc),
                Description = "Revolutionary AI model with advanced reasoning, multimodal capabilities, and superior efficiency",
                Capabilities = new List<string> { "Advanced Reasoning", "Multimodal Processing", "Scientific Analysis", "Code Generation", "Mathematical Problem Solving", "Creative Intelligence" },
                ContextWindow = "256K tokens",
                Pricing = "$3/1M input tokens, $10/1M output tokens",
                IsMultimodal = true
            },
            new AIModel
            {
                Name = "Claude 3.5 Sonnet",
                Version = "3.5",
                Company = "Anthropic",
                ReleaseDate = new DateTime(2024, 6, 20, 0, 0, 0, DateTimeKind.Utc),
                Description = "Advanced language model with enhanced safety and code generation capabilities",
                Capabilities = new List<string> { "Text Generation", "Code Generation", "Analysis", "Creative Writing", "Safety Reasoning" },
                ContextWindow = "200K tokens",
                Pricing = "$3/1M input tokens, $15/1M output tokens",
                IsMultimodal = false
            },
            new AIModel
            {
                Name = "DeepSeek V2.5",
                Version = "2.5",
                Company = "DeepSeek",
                ReleaseDate = new DateTime(2024, 7, 10, 0, 0, 0, DateTimeKind.Utc), // Changed from September to July
                Description = "Open-source MoE model with strong mathematics and coding capabilities",
                Capabilities = new List<string> { "Text Generation", "Mathematics", "Code Generation", "Scientific Reasoning" },
                ContextWindow = "64K tokens",
                Pricing = "Open Source - Self Hosted",
                IsMultimodal = false
            },
            new AIModel
            {
                Name = "Gemini 2.0",
                Version = "2.0",
                Company = "Google",
                ReleaseDate = new DateTime(2024, 8, 1, 0, 0, 0, DateTimeKind.Utc), // Changed from December to August
                Description = "Native multimodal model with massive context window",
                Capabilities = new List<string> { "Text Generation", "Image Analysis", "Document Processing", "Research", "Factual Reasoning" },
                ContextWindow = "2M tokens",
                Pricing = "$2.50/1M input tokens, $10/1M output tokens",
                IsMultimodal = true
            }
        };
    }
}
