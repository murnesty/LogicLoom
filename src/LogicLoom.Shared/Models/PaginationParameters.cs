using System;

namespace LogicLoom.Shared.Models;

public class PaginationParameters
{
    private const int MaxPageSize = 50;
    private int _pageSize = 20;

    public int PageNumber { get; set; } = 1;

    public int PageSize
    {
        get => _pageSize;
        set => _pageSize = Math.Min(value, MaxPageSize);
    }
}
