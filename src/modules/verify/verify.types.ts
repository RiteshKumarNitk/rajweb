export interface CertificateSignatory {
  name: string;
  title: string;
  organization: string;
  status: "OFFICIAL_VERIFIED" | "ACTIVE";
}

export interface CertificateVerificationResult {
  valid: boolean;
  message?: string;
  certificateNumber: string;
  name: string;
  fatherName?: string;
  championshipName: string;
  organizedBy: string;
  recognizedBy: string[];
  district: string;
  category: string;
  event: string;
  position: string;
  type: "player" | "coach" | "championship";
  venue?: string;
  issuedAt: Date | string;
  expiresAt?: Date | string | null;
  playerId?: string;
  coachId?: string;
  qrCode?: string;
  pdfPath?: string | null;
  signatories: {
    president: CertificateSignatory;
    generalSecretary: CertificateSignatory;
  };
}

export const OFFICIAL_SIGNATORIES = {
  president: {
    name: "Mr. Aamir Khan",
    title: "President",
    organization: "Rajasthan Racquetball Association",
    status: "OFFICIAL_VERIFIED" as const,
  },
  generalSecretary: {
    name: "Mr. Aashish Poonia",
    title: "General Secretary",
    organization: "Rajasthan Racquetball Association",
    status: "OFFICIAL_VERIFIED" as const,
  },
};

// Seeded / Sample State Championship certificates for testing and demonstration
export const SAMPLE_CHAMPIONSHIP_CERTIFICATES: CertificateVerificationResult[] = [
  {
    valid: true,
    certificateNumber: "RRA/STC/2026/001",
    name: "Rohan Sharma",
    fatherName: "Mr. Suresh Sharma",
    championshipName: "Sub-Junior/ Junior/ Senior Racquetball State Championship-2026-27",
    organizedBy: "Jaipur Racquetball Association",
    recognizedBy: [
      "Rajasthan Racquetball Association",
      "Indian Racquetball Association",
      "International Racquetball Federation & Asian Racquetball Federation",
    ],
    district: "Jaipur",
    category: "Junior",
    event: "Single",
    position: "1ST PLACE",
    type: "championship",
    venue: "Sawai Mansingh Indoor Stadium, Jaipur",
    issuedAt: "2026-06-30T00:00:00.000Z",
    signatories: OFFICIAL_SIGNATORIES,
  },
  {
    valid: true,
    certificateNumber: "RRA/STC/2026/002",
    name: "Priya Choudhary",
    fatherName: "Mr. Ramesh Choudhary",
    championshipName: "Sub-Junior/ Junior/ Senior Racquetball State Championship-2026-27",
    organizedBy: "Jaipur Racquetball Association",
    recognizedBy: [
      "Rajasthan Racquetball Association",
      "Indian Racquetball Association",
      "International Racquetball Federation & Asian Racquetball Federation",
    ],
    district: "Jodhpur",
    category: "Senior",
    event: "Mix",
    position: "2ND PLACE",
    type: "championship",
    venue: "Sawai Mansingh Indoor Stadium, Jaipur",
    issuedAt: "2026-06-30T00:00:00.000Z",
    signatories: OFFICIAL_SIGNATORIES,
  },
  {
    valid: true,
    certificateNumber: "RRA/STC/2026/003",
    name: "Amit Verma",
    fatherName: "Mr. Rajesh Verma",
    championshipName: "Sub-Junior/ Junior/ Senior Racquetball State Championship-2026-27",
    organizedBy: "Jaipur Racquetball Association",
    recognizedBy: [
      "Rajasthan Racquetball Association",
      "Indian Racquetball Association",
      "International Racquetball Federation & Asian Racquetball Federation",
    ],
    district: "Udaipur",
    category: "Sub-junior",
    event: "Double",
    position: "3RD PLACE",
    type: "championship",
    venue: "Sawai Mansingh Indoor Stadium, Jaipur",
    issuedAt: "2026-06-30T00:00:00.000Z",
    signatories: OFFICIAL_SIGNATORIES,
  },
  {
    valid: true,
    certificateNumber: "RRA/STC/2026/004",
    name: "Kavita Meena",
    fatherName: "Mr. Ramavtar Meena",
    championshipName: "Sub-Junior/ Junior/ Senior Racquetball State Championship-2026-27",
    organizedBy: "Jaipur Racquetball Association",
    recognizedBy: [
      "Rajasthan Racquetball Association",
      "Indian Racquetball Association",
      "International Racquetball Federation & Asian Racquetball Federation",
    ],
    district: "Kota",
    category: "Senior",
    event: "Double-Mix",
    position: "PARTICIPATION AS PLAYER",
    type: "championship",
    venue: "Sawai Mansingh Indoor Stadium, Jaipur",
    issuedAt: "2026-06-30T00:00:00.000Z",
    signatories: OFFICIAL_SIGNATORIES,
  },
  {
    valid: true,
    certificateNumber: "RRA/STC/2026/005",
    name: "Vikram Singh Rathore",
    fatherName: "Mr. Mahendra Singh Rathore",
    championshipName: "Sub-Junior/ Junior/ Senior Racquetball State Championship-2026-27",
    organizedBy: "Jaipur Racquetball Association",
    recognizedBy: [
      "Rajasthan Racquetball Association",
      "Indian Racquetball Association",
      "International Racquetball Federation & Asian Racquetball Federation",
    ],
    district: "Bikaner",
    category: "Masters",
    event: "Single",
    position: "1ST PLACE",
    type: "championship",
    venue: "Sawai Mansingh Indoor Stadium, Jaipur",
    issuedAt: "2026-06-30T00:00:00.000Z",
    signatories: OFFICIAL_SIGNATORIES,
  },
  {
    valid: true,
    certificateNumber: "RRA/STC/2026/006",
    name: "Ananya Joshi",
    fatherName: "Mr. Devendra Joshi",
    championshipName: "Sub-Junior/ Junior/ Senior Racquetball State Championship-2026-27",
    organizedBy: "Jaipur Racquetball Association",
    recognizedBy: [
      "Rajasthan Racquetball Association",
      "Indian Racquetball Association",
      "International Racquetball Federation & Asian Racquetball Federation",
    ],
    district: "Ajmer",
    category: "Junior",
    event: "Double",
    position: "1ST PLACE",
    type: "championship",
    venue: "Sawai Mansingh Indoor Stadium, Jaipur",
    issuedAt: "2026-06-30T00:00:00.000Z",
    signatories: OFFICIAL_SIGNATORIES,
  },
];
