namespace InvestorDataApi.Models;

public class CreateMappingRequest
{
    public string OriginalCustomerName { get; set; } = string.Empty;
    public string? CleanedCustomerName { get; set; }
    public int? CanonicalCustomerId { get; set; }

    // CustomerMaster fields (for create/update)
    public string? CanonicalCustomerName { get; set; }
    public string? CisCode { get; set; }
    public string? Mgs { get; set; }
    public string? CountryOfOperation { get; set; }
    public string? Region { get; set; }
}
