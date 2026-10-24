/* ---------- career module: researched guide (checked 24 Oct 2026) ---------- */
const GUIDE_CHECKED = '24 Oct 2026';
// Facts gathered with web search; passed to the AI so its advice matches the current market.
const MARKET_NOTES = `MARKET NOTES for IT networking and cybersecurity in Poland (researched ${GUIDE_CHECKED}; treat numbers as indicative):
- NIS2 is implemented in Poland by the amended National Cybersecurity System Act (KSC), in force since 3 April 2026. It widens the set of regulated companies (key and important entities). Self-registration ran 7 May to 3 October 2026. Most sources put full implementation of security measures at 3 April 2027; key entities need a first statutory audit by 3 April 2028. Supply-chain duties push requirements onto suppliers too. Practical demand: gap assessments, ISMS support, network segmentation, firewall and VPN hardening, logging/SIEM, incident response plans, staff training.
- Polish IT candidates mainly use JustJoin.it, No Fluff Jobs and Bulldogjob; Pracuj.pl covers general roles. GoldenLine closed in 2024.
- Network and security listings in Poland often ask for Cisco and Fortinet firewall experience.
- Salary guides disagree. One guide: network engineer employment contract roughly 6.5-8.5k PLN gross (junior), 11-14k (mid), 18-25k (senior); B2B about 12-22k PLN net. A Network & Security Engineer listing offered 20.9-27.9k PLN on B2B. Posted ranges on JustJoin.it / No Fluff Jobs are the best live check.
- ISC2 2025 workforce study: most-cited skill needs were AI security (41%) and cloud security (36%).
- Certifications that keep appearing: CCNA/CCNP, Fortinet and Palo Alto firewall certs, CompTIA Security+, CISSP (senior), OSCP and PenTest+ (offensive).
- Crowdsourced security: HackerOne reported record researcher payouts (US$89.1M, Jul 2025 - Jun 2026). Intigriti (EU) and YesWeHack (Paris; European Commission framework contract 2025) are European platforms. Bugcrowd throttles low-accuracy, AI-generated submissions, so quality matters. Cobalt Core hires freelance pentesters with 4+ years of experience; postings are often limited to certain countries and referrals help.
- Remote cybersecurity roles for Western European employers reportedly pay about 8-15% above local office rates (recruiter source).`;

const GUIDE = [
  { title: 'Job boards in Poland', items: [
    { name: 'JustJoin.it', url: 'https://justjoin.it', checked: true, good: 'IT-only board with a Security category; salary ranges on most offers; many remote roles.', how: 'Apply on the offer page or the employer’s form; a profile with a CV speeds it up.', lang: 'Polish and English offers', cost: 'Free for candidates', tip: 'Filter by Security and by B2B vs employment contract to compare real rates.' },
    { name: 'No Fluff Jobs', url: 'https://nofluffjobs.com', checked: true, good: 'IT board with mandatory salary ranges; useful for network and security roles.', how: 'Apply through the offer; some redirect to the company ATS.', lang: 'Polish and English', cost: 'Free', tip: 'Read the “must have” list and mirror those keywords in your CV.' },
    { name: 'Bulldogjob', url: 'https://bulldogjob.pl', checked: true, good: 'Third big IT board in Poland.', how: 'Apply on the offer page.', lang: 'Mostly Polish', cost: 'Free', tip: 'Good for companies that don’t post elsewhere.' },
    { name: 'Pracuj.pl', url: 'https://www.pracuj.pl', checked: true, good: 'Largest general board; IT admin, network and corporate security roles, plus public sector and banks.', how: 'One-click apply with a profile, or the employer’s form.', lang: 'Mostly Polish', cost: 'Free', tip: 'Search “network engineer”, “administrator sieci”, “SOC”, “cyberbezpieczeństwo”.' },
    { name: 'theprotocol.it', url: 'https://theprotocol.it', checked: false, good: 'IT board run by the Pracuj group.', how: 'Apply on the offer page.', lang: 'Polish and English', cost: 'Free', tip: 'Not checked today; compare its security listings with JustJoin.it.' },
    { name: 'LinkedIn Jobs', url: 'https://www.linkedin.com/jobs', checked: false, good: 'International and remote roles; recruiters search profiles directly.', how: 'Easy Apply or the company site; recruiter messages.', lang: 'Mostly English', cost: 'Free (Premium optional)', tip: 'An English headline with your stack (Cisco, Fortinet, SIEM) gets you found by recruiters.' }
  ] },
  { title: 'Remote and international', items: [
    { name: 'Working Nomads', url: 'https://www.workingnomads.com/remote-cyber-security-jobs-europe', checked: true, good: 'Remote cyber security jobs in Europe (full-time, part-time, freelance).', how: 'Links out to the employer’s application.', lang: 'English', cost: 'Free', tip: 'Check time-zone and contract requirements; some roles are country-limited.' },
    { name: 'EURES', url: 'https://eures.europa.eu', checked: false, good: 'EU job mobility portal.', how: 'Apply via the listing or national employment services.', lang: 'Mostly English and local languages', cost: 'Free', tip: 'Not checked today.' },
    { name: 'Recruitment agencies (e.g. Michael Page)', url: 'https://www.michaelpage.pl', checked: true, good: 'Network and security roles in Polish cities, often not public elsewhere.', how: 'Send a CV to a consultant or apply on the listing; expect a screening call.', lang: 'Polish and English', cost: 'Free for candidates', tip: 'Ask the recruiter for the salary band before the first interview.' }
  ] },
  { title: 'Freelance and B2B', items: [
    { name: 'Useme', url: 'https://useme.com', checked: true, good: 'Polish platform that invoices clients for you if you don’t have a company; also lists projects.', how: 'Fill in a short form (client, project, price); the client pays via a link.', lang: 'Polish', cost: 'Fee per invoice or subscription (check current pricing)', tip: 'Useful for first small network jobs before registering a business.' },
    { name: 'Upwork', url: 'https://www.upwork.com', checked: false, good: 'Global freelance projects: firewall setup, VPN, network audits, security reviews.', how: 'Proposals cost paid credits (“Connects”); write short, specific proposals.', lang: 'English', cost: 'Platform fee + Connects', tip: 'Not checked today. Lead with a concrete result and one relevant certificate.' },
    { name: 'Malt / Toptal / Contra', url: 'https://www.malt.com', checked: false, good: 'European and vetted freelance networks.', how: 'Profile + screening (Toptal has a multi-stage test).', lang: 'English', cost: 'Commission', tip: 'Not checked today; pick one and complete the profile fully.' }
  ] },
  { title: 'Bug bounty and freelance pentesting', items: [
    { name: 'Intigriti', url: 'https://www.intigriti.com', checked: true, good: 'European bug bounty platform; pay for valid findings.', how: 'Create a researcher profile, join public programs, submit reports.', lang: 'English', cost: 'Free', tip: 'Start with a few programs and learn to write clear reports; quality beats volume.' },
    { name: 'YesWeHack', url: 'https://www.yeswehack.com', checked: true, good: 'European platform (Paris) with public and private programs, including EU institutions.', how: 'Researcher account, public programs, invitations to private ones.', lang: 'English', cost: 'Free', tip: 'Good reports lead to private invitations.' },
    { name: 'HackerOne / Bugcrowd', url: 'https://www.hackerone.com', checked: true, good: 'Largest platforms; record payouts reported for 2025-26.', how: 'Join programs and submit reports.', lang: 'English', cost: 'Free', tip: 'Bugcrowd throttles low-accuracy AI-generated reports; never submit unverified findings.' },
    { name: 'Cobalt Core', url: 'https://www.cobalt.io', checked: true, good: 'Paid freelance pentests (web, API, internal/external networks).', how: 'Apply via careers; selective, 4+ years experience, often country-limited, referrals preferred.', lang: 'English', cost: 'Free', tip: 'Certs like OSCP or PenTest+ help; check which countries the current posting accepts.' }
  ] },
  { title: 'Finding your own clients', items: [
    { name: 'NIS2 / KSC readiness for SMEs', url: 'https://kpmg.com/pl/en/insights/law/legal-alert-the-nis2-directive-implemented-in-poland-new-cybersecurity-obligations-for-entrepreneurs.html', checked: true, good: 'Companies covered by KSC, and their suppliers, must implement security measures (most sources: by 3 April 2027).', how: 'Offer a fixed-price technical package: network inventory, segmentation, firewall/VPN hardening, logging, incident response plan.', lang: 'Polish', cost: '–', tip: 'Partner with a law or compliance firm: they cover legal duties, you cover the technical work.' },
    { name: 'MSP / MSSP subcontracting', url: 'https://clutch.co', checked: false, good: 'Managed service providers need extra hands for deployments and audits.', how: 'Find MSPs (Clutch, LinkedIn, local IT firms) and offer white-label work.', lang: 'Polish and English', cost: '–', tip: 'A one-page offer with rates and 3 example jobs works better than a CV.' },
    { name: 'Local businesses', url: '', checked: false, good: 'Offices, clinics, accounting firms: Wi-Fi, VPN, backups, basic hardening.', how: 'Referrals, local business groups, a simple website or Google Business profile.', lang: 'Polish', cost: '–', tip: 'Fixed-price packages are easier to sell than hourly rates.' },
    { name: 'Community and conferences', url: '', checked: false, good: 'OWASP Poland chapters, BSides Warsaw, CONFidence (Kraków), PLNOG (network operators).', how: 'Attend, give a short talk, follow up on LinkedIn in English.', lang: 'Polish and English', cost: 'Tickets vary', tip: 'Not checked today; confirm dates on each event’s site.' }
  ] }
];

const GUIDE_SOURCES = [
  ['KPMG Poland: NIS2 implemented in Poland', 'https://kpmg.com/pl/en/insights/law/legal-alert-the-nis2-directive-implemented-in-poland-new-cybersecurity-obligations-for-entrepreneurs.html'],
  ['Osborne Clarke: KSC amendment signed', 'https://www.osborneclarke.com/insights/polands-amendment-national-cybersecurity-system-act-has-been-signed-president'],
  ['CMS: NIS2 supply-chain duties in Poland', 'https://cms.law/en/pol/legal-updates/cybersecurity-in-the-supply-chain-what-nis2-changes-in-poland'],
  ['100hires: Polish job boards compared (2026)', 'https://100hires.com/polish-job-boards.html'],
  ['JustJoin.it security offers', 'https://justjoin.it/job-offers/poznan/security'],
  ['Freenance: network engineer salary in Poland 2026', 'https://freenance.io/professions/network-engineer-salary-poland/'],
  ['ITmagination: Network & Security Engineer listing', 'https://www.itmagination.com/open-jobs/8050000033855733'],
  ['Infosec Institute: top security certifications 2026', 'https://infosecinstitute.com/resources/professional-development/7-top-security-certifications-you-should-have/'],
  ['Stingrai: bug bounty statistics 2026', 'https://www.stingrai.io/blog/bug-bounty-statistics-2026'],
  ['Cobalt Core pentester posting', 'https://job-boards.greenhouse.io/cobaltio/jobs/5688200002'],
  ['YesWeHack: European Commission bug bounty tender', 'https://www.businesswire.com/news/home/20251001342504/en/YesWeHack-Won-the-European-Commissions-Latest-Bug-Bounty-Tender'],
  ['Useme (Wikipedia)', 'https://en.wikipedia.org/wiki/Useme'],
  ['Working Nomads: remote cyber security jobs in Europe', 'https://www.workingnomads.com/remote-cyber-security-jobs-europe'],
  ['Optima Europe: remote cybersecurity hiring in Europe', 'https://www.optimaeurope.com/recruitment-blog/remote-cybersecurity-hiring-salary-and-compliance-guide-europe']
];
const APP_STATUS = [['saved', 'Saved'], ['applied', 'Applied'], ['interview', 'Interview'], ['offer', 'Offer'], ['rejected', 'Rejected']];
