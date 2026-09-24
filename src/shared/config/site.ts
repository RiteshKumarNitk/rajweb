export const siteConfig = {
  name: "Rajasthan Racquetball Association",
  shortName: "RRA",
  tagline: "Let's Win Together",
  description:
    "Official State Body for Racquetball in Rajasthan. RRA conducts structured tournaments, certification programs, and official training initiatives aligned with national and international standards.",
  url: process.env.APP_URL || "https://rajasthanracquetball.com",
  email: "rajasthanracquetball@gmail.com",
  website: "rajasthanracquetball.com",
  phone: "+91 99289 62982",
  phones: [
    "+91 99289 62982",
    // "+91 95219 40184",
  ],
  registeredOffice: "Karani Colony, Durga Path, Ambabari, Jaipur (Raj.)",
  headOffice: "650, Indra Colony, Nohar, Hanumangarh (Raj.)-335523",
  address: "Rajasthan, India",
  social: {
    facebook: "https://facebook.com/rajasthanracquetball",
    instagram: "https://instagram.com/rajasthanracquetball",
    youtube: "https://youtube.com/rajasthanracquetball",
    twitter: "https://twitter.com/rajasthanracquetball",
  },
  colors: {
    primary: "#0F172A",
    secondary: "#DC2626",
    accent: "#F59E0B",
    background: "#F8FAFC",
  },
  /** Official website development partner — footer attribution */
  developer: {
    name: "InnovateX Technology Pvt. Ltd.",
    shortName: "InnovateX Technology",
    url: "https://innovatex-technology.com/",
  },
};

export const navigation = {
  main: [
    { name: "Home", href: "/" },
    {
      name: "About",
      href: "/about",
      children: [
        { name: "About Racquetball", href: "/about/racquetball" },
        { name: "RRA History", href: "/about/history" },
        { name: "Executive Committee", href: "/about/executive-committee" },
        { name: "Rules & Policies", href: "/about/rules-policies" },
        { name: "Districts", href: "/districts" },
      ],
    },
    {
      name: "Membership",
      href: "/membership",
      children: [
        { name: "Club Membership", href: "/membership/club" },
        { name: "School Membership", href: "/membership/school" },
        { name: "Academy Membership", href: "/membership/academy" },
      ],
    },
    {
      name: "Tournaments",
      href: "/tournaments",
    },
    {
      name: "Media",
      href: "/media",
      children: [
        { name: "News", href: "/media/news" },
        { name: "Videos", href: "/media/videos" },
        { name: "Photo Gallery", href: "/media/gallery" },
      ],
    },
    {
      name: "Resources",
      href: "/resources",
      children: [
        { name: "Court Specifications", href: "/resources/court-specifications" },
        { name: "Equipment Information", href: "/resources/equipment" },
        { name: "Physio Partners", href: "/resources/physio-partners" },
        { name: "Player Registration", href: "/register/player" },
        { name: "Coach Registration", href: "/register/coach" },
        { name: "Certificate Verification", href: "/verify" },
      ],
    },
    { name: "Contact", href: "/contact" },
  ],
  footer: [
    {
      title: "About RRA",
      links: [
        { name: "About Racquetball", href: "/about/racquetball" },
        { name: "RRA History", href: "/about/history" },
        { name: "Executive Committee", href: "/about/executive-committee" },
        { name: "District Associations", href: "/districts" },
      ],
    },
    {
      title: "Membership",
      links: [
        { name: "Club Membership", href: "/membership/club" },
        { name: "School Membership", href: "/membership/school" },
        { name: "Academy Membership", href: "/membership/academy" },
        { name: "Player Registration", href: "/register/player" },
      ],
    },
    {
      title: "Resources",
      links: [
        { name: "Tournaments", href: "/tournaments" },
        { name: "Court Specifications", href: "/resources/court-specifications" },
        { name: "Certificate Verification", href: "/verify" },
        { name: "Donations", href: "/donations" },
      ],
    },
    {
      title: "Governance",
      links: [
        { name: "RTI & Governance", href: "/governance/rti" },
        { name: "Anti-Doping Compliance", href: "/governance/anti-doping" },
        { name: "Privacy Policy", href: "/governance/privacy-policy" },
        { name: "Rules & Policies", href: "/about/rules-policies" },
        { name: "Contact Us", href: "/contact" },
      ],
    },
  ],
};

/** Official RRA affiliation / leadership banner (`public/images/RRA.jpeg`). */
export const RRA_OFFICIAL_BANNER = "/images/RRA.jpeg";

export const siteImages = {
  logo: "/images/cropped-rra-logo.webp",
  logoLarge: "/images/rra-logo-2-1024x995.webp",
  favicon: "/images/cropped-rra-logo-32x32.webp",
  banner: "/images/LED_Banner_2240x128px-Road-to-Chengdu3-1024x59.png",
  about: RRA_OFFICIAL_BANNER,
  president: "/images/rra/portrait-aamir-khan.jpg",
  generalSecretary: "/images/asishpooniawalaimage.jpeg",
  social: {
    facebook: "/images/fb-1-1024x1024.webp",
    instagram: "/images/Instagram_icon.png-1024x1024.webp",
    youtube: "/images/yt-image-1.png",
  },
  equipment: {
    racquet: "/images/racquetballracquet.jpeg",
    balls: "/images/racquetball-balls.webp",
    eyewear: "/images/equipemntimage1.jpeg",
    overview: "/images/racquetball-spec-1024x1024.webp",
  },
  court: {
    indoor: "/images/rra/training-camp-court.jpg",
    indoorSlider: [
      "/images/rra/indoor-court-1.jpg",
      "/images/rra/indoor-court-2.jpg",
    ],
    outdoor: "/images/rra/outdoor-court-facility.jpg",
    outdoorSlider: [
      "/images/rra/outdoor-court-1.jpg",
      "/images/rra/outdoor-court-2.jpg",
    ],
  },
  sponsors: [
    { name: "Brightmoon Learning Solutions", logo: "/images/sponsor-logo1.jpeg" },
    { name: "Eagle Martial Arts Sports Association", logo: "/images/sponsor-logo-eagle.jpeg" },
  ],
  federations: [
    { name: "Indian Racquetball Association", logo: "/images/indianrracqasso-1.jpg" },
    { name: "International Racquetball Federation", logo: "/images/irflogo2.jpeg" },
    { name: "ARF", logo: "/images/logo-arf-bicolor-raqueta.png" },
    { name: "International Federation", logo: "/images/international.webp" },
    { name: "The World Games", logo: "/images/theworldgames.webp" },
    { name: "International Olympic Committee", logo: "/images/olympiccouncil.jpeg" },
  ],
  gallery: [
    { title: "State Championship Poster", src: "/images/rra/poster-state-championship-2026.jpg", category: "Tournament" },
    { title: "National Championship Award", src: "/images/rra/award-national-championship.jpg", category: "Events" },
    { title: "Live Match Action", src: "/images/rra/action-court-01.jpg", category: "Action" },
    { title: "Tournament Rally", src: "/images/rra/action-court-02.jpg", category: "Action" },
    { title: "Inter-State Competition", src: "/images/rra/action-court-03.jpg", category: "Action" },
    { title: "Championship Point", src: "/images/rra/action-court-04.jpg", category: "Action" },
    { title: "Training Camp on Court", src: "/images/rra/training-camp-court.jpg", category: "Training" },
    { title: "Glass Court Action", src: "/images/rra/action-court-05.jpg", category: "Action" },
    { title: "RRA Team Group Photo", src: "/images/rra/team-group-01.jpg", category: "Team" },
    { title: "State Team with Officials", src: "/images/rra/team-group-02.jpg", category: "Team" },
    { title: "Outdoor Court Play", src: "/images/rra/outdoor-court-action.jpg", category: "Facilities" },
    { title: "Outdoor Racquetball Facility", src: "/images/rra/outdoor-court-facility.jpg", category: "Facilities" },
    { title: "RRA Official Banner", src: RRA_OFFICIAL_BANNER, category: "Leadership" },
    { title: "RRA Affiliations", src: RRA_OFFICIAL_BANNER, category: "Leadership" },
  ],
  rra: {
    poster: "/images/rra/poster-state-championship-2026.jpg",
    affiliationPoster: RRA_OFFICIAL_BANNER,
    leadershipBanner: RRA_OFFICIAL_BANNER,
    leadershipCardsBanner: RRA_OFFICIAL_BANNER,
    physioBanner: RRA_OFFICIAL_BANNER,
  },
};

export type TournamentEventStatus = "Upcoming" | "Ongoing" | "Completed";

export type TournamentEvent = {
  id: string;
  title: string;
  date: string;
  venue: string;
  location: string;
  status: TournamentEventStatus;
  ageGroups: string[];
  events: string[];
  poster: string;
};

/** Current RRA tournament — details from official poster. */
export const tournamentEvents: TournamentEvent[] = [
  {
    id: "state-championship-2026",
    title: "Racquetball Training Camp & Racquetball State Championship",
    date: "30 June 2026",
    venue: "Jaipur",
    location: "Jaipur",
    status: "Upcoming",
    ageGroups: ["Sub Junior", "Junior", "Senior"],
    events: ["Singles", "Doubles", "Mixed"],
    poster: "/images/rra/poster-state-championship-2026.jpg",
  },
];

export const tournamentPoster = tournamentEvents[0];

export type ExecutiveMember = {
  name: string;
  role: string;
  photo: string;
  description: string;
  badge?: string;
  positions?: { role: string; organization: string }[];
};

export const executiveCommittee: ExecutiveMember[] = [
  // {
  //   name: "Mr. Ravindra Singh Bhati",
  //   role: "MLA",
  //   badge: "Support By RRA",
  //   photo: "/images/rra/portrait-ravindra-bhati.jpg",
  //   description:
  //     "Supports RRA initiatives, district coordination, and statewide promotion of racquetball development programs.",
  // },
  // {
  //   name: "Mr. Aamir Khan",
  //   role: "President",
  //   photo: "/images/rra/portrait-aamir-khan.jpg",
  //   description:
  //     "Provides overall leadership and strategic direction for RRA operations and development initiatives across Rajasthan.",
  // },
  // {
  //   name: "Mr. Ajay Singh Meena",
  //   role: "Vice President",
  //   photo: "/images/rra/portrait-ajay-meena.jpg",
  //   description:
  //     "Assists in tournament planning, player outreach, and strengthening racquetball at the district level across Rajasthan.",
  // },
  // {
  //   name: "Mr. Ravi Singh Rajput",
  //   role: "Vice President",
  //   photo: "/images/rra/portrait-ravi-singh-rajput.jpg",
  //   description:
  //     "Represents the Rajasthan Racquetball Association and supports executive leadership in statewide racquetball development and governance.",
  // },
  {
    name: "Mr. Aashish Poonia",
    role: "Founder & General Secretary",
    photo: "/images/asishpooniawalaimage.jpeg",
    positions: [
      { role: "Founder & General Secretary", organization: "Rajasthan Racquetball Association" },
      { role: "Vice President", organization: "Indian Racquetball Association" },
    ],
    description:
      "Leads RRA administration, membership operations, and national-level coordination with the Indian Racquetball Association.",
  },
  // {
  //   name: "Mr. Suresh Kumar",
  //   role: "Joint Secretary",
  //   photo: "/images/rra/portrait-suresh-kumar.jpg",
  //   description:
  //     "Supports the Rajasthan Racquetball Association in administrative coordination, records, and executive committee operations.",
  // },
  // {
  //   name: "Mr. Manoj Choudhary",
  //   role: "Treasurer",
  //   photo: "/images/manoj-kumar-edited-1.webp",
  //   description:
  //     "Oversees financial management, budgeting, and transparent reporting of association funds.",
  // },
];

export const physioPartners = [
  {
    name: "Ankit Bhardwaj",
    organization: "ABPT — High Performance Sports Science Centre",
    role: "Head Physio, Rajasthan Racquetball Association",
    photo: "/images/rra/portrait-ankit-bhardwaj.jpg",
    location: "Jaipur",
    phone: "+91 99289 62982",
    services: [
      "Sports injury assessment & rehabilitation",
      "Pre-competition screening",
      "High-performance sports science support",
      "On-tournament physio coverage",
    ],
  },
];

export const districtLogos: Record<string, string> = {
  Alwar: "/images/rra/district-alwar-logo.jpg",
  Dausa: "/images/rra/district-dausa-logo.jpg",
  Hanumangarh: "/images/rra/district-hanumangarh-logo.jpg",
  Jodhpur: "/images/rra/district-jodhpur-logo.jpg",
  Sirohi: "/images/rra/district-sirohi-logo.jpg",
};

export const heroSlides = [
  {
    id: 1,
    title: "Rajasthan Racquetball Association",
    subtitle: "Official State Body for Racquetball in Rajasthan",
    description: "Promoting excellence in racquetball across Rajasthan through structured tournaments, certification programs, and official training initiatives.",
    cta: { primary: { label: "Join RRA", href: "/membership/club" }, secondary: { label: "View Tournaments", href: "/tournaments" } },
    image: "/images/rra/action-court-01.jpg",
  },
  {
    id: 2,
    title: "Let's Win Together",
    subtitle: "Building Champions Across Rajasthan",
    description: "From grassroots training to state-level championships, RRA is committed to developing racquetball talent at every level.",
    cta: { primary: { label: "Register as Player", href: "/register/player" }, secondary: { label: "Learn More", href: "/about/racquetball" } },
    image: "/images/rra/action-court-05.jpg",
  },
  {
    id: 3,
    title: "Globally Recognised Sport",
    subtitle: "IOC Recognized Since 1985",
    description: "Racquetball was a charter member of the World Games in 1981 and has been included in five IOC-Recognized Continental Games since 1995.",
    cta: { primary: { label: "About Racquetball", href: "/about/racquetball" }, secondary: { label: "RRA History", href: "/about/history" } },
    image: "/images/rra/training-camp-court.jpg",
  },
];

export const achievements = [
  { label: "District Associations", value: "33+" },
  { label: "Registered Players", value: "500+" },
  { label: "Tournaments Held", value: "25+" },
  { label: "Certified Coaches", value: "50+" },
];

export const testimonials = [
  {
    quote: "RRA provides excellent opportunities for young and upcoming players. From district-level events to state championships, the structure and management are impressive. It truly helps athletes move forward.",
    author: "Neha Verma",
    role: "State Player",
  },
  {
    quote: "Professional management and a strong commitment to the sport. The association works consistently to develop racquetball in Rajasthan and maintains clear communication with players and coaches.",
    author: "Rohit Meena",
    role: "Coach",
  },
  {
    quote: "The Rajasthan Racquetball Association is doing excellent work in promoting the sport across the state. From grassroots training to state-level championships, their efforts are consistent and impactful.",
    author: "Pooja Sharma",
    role: "Club Member",
  },
];

export const aboutRacquetball = {
  title: "About Racquetball",
  content: `Racquetball is a racquet sport played with a hollow rubber ball on an indoor or outdoor court. It was invented in 1950 by Joseph Sobek in Greenwich, Connecticut. The sport combines elements of handball, squash, and tennis.

Racquetball was one of the charter members of the World Games first held in 1981. It has been included in five IOC-Recognized Continental Games, including the Pan American Games, since 1995. The International Racquetball Federation (IRF) was formed in 1979 and was recognized by the International Olympic Committee (IOC) in 1985 — one of the youngest sports ever to receive this recognition.

In India, the Indian Racquetball Association (IRA) was formed in 2023 and is affiliated to the International Racquetball Federation. The Rajasthan Racquetball Association (RRA) was formed in 2025 and received affiliation from the IRA in the same year.`,
};

export const rraHistory = {
  title: "RRA History",
  content: `The Rajasthan Racquetball Association (RRA) was formed in 2025. It was affiliated by the Indian Racquetball Association (IRA) in 2025. The Indian Racquetball Association was formed in 2023 and is affiliated to the International Racquetball Federation (IRF), which was formed in 1979. It was recognized by the International Olympic Committee (IOC) in 1985 — one of the youngest sports ever to receive this recognition.

Racquetball was one of the charter members of the World Games first held in 1981. It has been included in five IOC-Recognized Continental Games, including the Pan American Games, since 1995.

RRA is committed to promoting racquetball across all 33 districts of Rajasthan, conducting state-level championships, certification programs, and grassroots development initiatives.`,
};

export const courtSpecifications = {
  indoor: {
    title: "Indoor Court Specifications",
    dimensions: {
      length: "12.19 m (40 ft)",
      width: "6.10 m (20 ft)",
      height: "6.10 m (20 ft) minimum",
    },
    features: [
      "Hardwood or synthetic flooring",
      "Four walls — front, back, and two side walls",
      "Service zone marked 1.83 m from front wall",
      "Receiving line 3.05 m from front wall",
      "Short line 5.49 m from front wall",
      "Proper lighting minimum 300 lux",
      "Ventilation and climate control recommended",
    ],
  },
  outdoor: {
    title: "Outdoor Court Specifications",
    dimensions: {
      length: "12.19 m (40 ft)",
      width: "6.10 m (20 ft)",
      height: "Front wall minimum 3.05 m (10 ft)",
    },
    features: [
      "Concrete or asphalt surface with proper coating",
      "Three walls — front and two side walls",
      "Back wall optional for outdoor courts",
      "Weather-resistant materials",
      "Proper drainage system",
      "Fencing around court perimeter",
      "Shade structures recommended",
    ],
  },
};

export type YoutubeMediaItem = {
  title: string;
  description: string;
  category: string;
  url: string;
  videoId?: string;
  thumbnail?: string;
  kind: "channel" | "video" | "short";
};

export const youtubeMedia: YoutubeMediaItem[] = [
  {
    kind: "channel",
    title: "Rajasthan Racquetball Association",
    description: "Official YouTube channel — subscribe for updates, highlights, and training content.",
    category: "Channel",
    url: "https://www.youtube.com/@rajasthanracquetball",
    thumbnail: "/images/yt-image-1.png",
  },
  {
    kind: "video",
    videoId: "pLGlTGkzzIQ",
    thumbnail: "/images/youtube/pLGlTGkzzIQ.jpg",
    title: "RRA on YouTube",
    description: "Watch on the official Rajasthan Racquetball Association channel.",
    category: "Video",
    url: "https://youtu.be/pLGlTGkzzIQ",
  },
  {
    kind: "video",
    videoId: "7Acp9ngn6E8",
    thumbnail: "/images/youtube/7Acp9ngn6E8.jpg",
    title: "RRA on YouTube",
    description: "Watch on the official Rajasthan Racquetball Association channel.",
    category: "Video",
    url: "https://youtu.be/7Acp9ngn6E8",
  },
  {
    kind: "short",
    videoId: "tscx8UhkHfk",
    thumbnail: "/images/youtube/tscx8UhkHfk.jpg",
    title: "RRA Short",
    description: "Quick racquetball update from RRA.",
    category: "Short",
    url: "https://www.youtube.com/shorts/tscx8UhkHfk",
  },
  {
    kind: "short",
    videoId: "ZEGnOKNleeE",
    thumbnail: "/images/youtube/ZEGnOKNleeE.jpg",
    title: "RRA Short",
    description: "Quick racquetball update from RRA.",
    category: "Short",
    url: "https://www.youtube.com/shorts/ZEGnOKNleeE",
  },
  {
    kind: "short",
    videoId: "gKnvRspXOLw",
    thumbnail: "/images/youtube/gKnvRspXOLw.jpg",
    title: "RRA Short",
    description: "Quick racquetball update from RRA.",
    category: "Short",
    url: "https://www.youtube.com/shorts/gKnvRspXOLw",
  },
];

export const rajasthanDistricts = [
  "Ajmer", "Alwar", "Banswara", "Baran", "Barmer", "Bharatpur", "Bhilwara",
  "Bikaner", "Bundi", "Chittorgarh", "Churu", "Dausa", "Dholpur", "Dungarpur",
  "Hanumangarh", "Jaipur", "Jaisalmer", "Jalore", "Jhalawar", "Jhunjhunu",
  "Jodhpur", "Karauli", "Kota", "Nagaur", "Pali", "Pratapgarh", "Rajsamand",
  "Sawai Madhopur", "Sikar", "Sirohi", "Sri Ganganagar", "Tonk", "Udaipur",
];
