using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.JSInterop;
using LogicLoom.Shared.Models;
using System.Text.Json;

namespace LogicLoom.Client.Services
{
    public interface IDocumentCache
    {
        Task<T?> GetAsync<T>(string key) where T : class;
        Task SetAsync<T>(string key, T value, TimeSpan? expiration = null) where T : class;
        Task RemoveAsync(string key);
        Task ClearAsync();
    }

    public class DocumentCache : IDocumentCache
    {
        private readonly IJSRuntime _jsRuntime;
        private readonly Dictionary<string, (object Value, DateTime? Expiration)> _memoryCache;

        public DocumentCache(IJSRuntime jsRuntime)
        {
            _jsRuntime = jsRuntime;
            _memoryCache = new Dictionary<string, (object Value, DateTime? Expiration)>();
        }

        public async Task<T?> GetAsync<T>(string key) where T : class
        {
            // First check memory cache
            if (_memoryCache.TryGetValue(key, out var cached))
            {
                if (cached.Expiration == null || cached.Expiration > DateTime.UtcNow)
                {
                    return cached.Value as T;
                }
                _memoryCache.Remove(key);
            }

            // Then check localStorage
            try
            {
                var json = await _jsRuntime.InvokeAsync<string>("localStorage.getItem", key);
                if (string.IsNullOrEmpty(json))
                    return null;

                var storedData = JsonSerializer.Deserialize<StoredData<T>>(json);
                if (storedData == null || (storedData.Expiration != null && storedData.Expiration < DateTime.UtcNow))
                {
                    await _jsRuntime.InvokeVoidAsync("localStorage.removeItem", key);
                    return null;
                }

                // Cache in memory for faster subsequent access
                _memoryCache[key] = (storedData.Value, storedData.Expiration);
                return storedData.Value;
            }
            catch
            {
                return null;
            }
        }

        public async Task SetAsync<T>(string key, T value, TimeSpan? expiration = null) where T : class
        {
            DateTime? expirationDate = expiration.HasValue ? DateTime.UtcNow.Add(expiration.Value) : null;

            // Store in memory cache
            _memoryCache[key] = (value, expirationDate);

            // Store in localStorage
            var storedData = new StoredData<T>
            {
                Value = value,
                Expiration = expirationDate
            };

            var json = JsonSerializer.Serialize(storedData);
            await _jsRuntime.InvokeVoidAsync("localStorage.setItem", key, json);
        }

        public async Task RemoveAsync(string key)
        {
            _memoryCache.Remove(key);
            await _jsRuntime.InvokeVoidAsync("localStorage.removeItem", key);
        }

        public async Task ClearAsync()
        {
            _memoryCache.Clear();
            await _jsRuntime.InvokeVoidAsync("localStorage.clear");
        }

        private class StoredData<T>
        {
            public T Value { get; set; } = default!;
            public DateTime? Expiration { get; set; }
        }
    }
}
