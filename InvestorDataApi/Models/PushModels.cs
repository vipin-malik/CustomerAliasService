namespace InvestorDataApi.Models;

public class PushToDbRequest
{
    public List<PushRecord> Records { get; set; } = [];
}

public class PushRecord
{
    public string OriginalCustomerName { get; set; } = string.Empty;
    public string? CleanedCustomerName { get; set; }
    public int? CanonicalCustomerId { get; set; }
    public string? CanonicalCustomerName { get; set; }
    public string? CisCode { get; set; }
    public string? CountryOfOperation { get; set; }
    public string? Region { get; set; }
    public string? Mgs { get; set; }
}

public class PushToDbResponse
{
    public int MappingsCreated { get; set; }
    public int MappingsUpdated { get; set; }
    public int MastersCreated { get; set; }
    public int MastersUpdated { get; set; }
    public int TotalProcessed { get; set; }
    public List<string> Errors { get; set; } = [];
}
