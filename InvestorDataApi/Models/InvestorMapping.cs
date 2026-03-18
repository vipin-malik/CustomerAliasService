using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace InvestorDataApi.Models;

[Table("InvestorMapping", Schema = "InvestorAlias")]
public class InvestorMapping
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    [Required]
    [MaxLength(500)]
    public string OriginalInvestorName { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? CleanedName { get; set; }

    [MaxLength(100)]
    public string? InvestorId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
