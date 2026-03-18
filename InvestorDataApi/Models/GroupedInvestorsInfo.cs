using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace InvestorDataApi.Models;

[Table("GroupedInvestorsInfo", Schema = "InvestorAlias")]
public class GroupedInvestorsInfo
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    [MaxLength(100)]
    public string? GroupedCustId { get; set; }

    [MaxLength(500)]
    public string? CustomerName { get; set; }

    [MaxLength(100)]
    public string? GroupedId { get; set; }

    [MaxLength(500)]
    public string? GroupedName { get; set; }

    [MaxLength(200)]
    public string? Country { get; set; }

    [MaxLength(200)]
    public string? Region { get; set; }

    [MaxLength(50)]
    public string? CisCode { get; set; }

    [MaxLength(100)]
    public string? AssetClass { get; set; }
}
