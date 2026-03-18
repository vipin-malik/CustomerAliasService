namespace InvestorDataApi.Models;

public class ResolveRequest
{
    public string AliasName { get; set; } = string.Empty;
    public string? AssetClass { get; set; }
}

public class ResolveResponse
{
    public string? CustomerName { get; set; }
    public string? CommonName { get; set; }
    public bool IsResolved { get; set; }
    public double? ConfidenceScore { get; set; }
    public string? MatchedAlias { get; set; }
    public int? CanonicalCustomerId { get; set; }
    public string? CanonicalCustomerName { get; set; }
    public string? CisCode { get; set; }
    public string? Country { get; set; }
    public string? Region { get; set; }
    public string? Mgs { get; set; }
    public List<PotentialMatch>? PotentialMatches { get; set; }
}

public class PotentialMatch
{
    public string CommonName { get; set; } = string.Empty;
    public string MatchedAlias { get; set; } = string.Empty;
    public double ConfidenceScore { get; set; }
}

public class BulkResolveRequest
{
    public List<ResolveRequest> Aliases { get; set; } = [];
}
