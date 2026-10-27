// Sample data for the Dive Potato admin (ข้อมูลตัวอย่าง). Prices, people and dates are made up so
// the owner can try the backend; replace them with real content before launch.

type L = { th: string; en: string }

export const SAMPLE_NOTE: L = {
  th: 'ข้อมูลตัวอย่างสำหรับทดลองระบบ',
  en: 'Sample data for trying out the system',
}

export const PHOTOS: { file: string; alt: L }[] = [
  {
    file: 'diver-green-reef.webp',
    alt: { th: 'นักดำน้ำเหนือแนวปะการัง', en: 'Diver over a green reef' },
  },
  { file: 'manta-diver.webp', alt: { th: 'นักดำน้ำกับกระเบนราหู', en: 'Diver with a manta ray' } },
  { file: 'bigeye-school.webp', alt: { th: 'ฝูงปลาตาโต', en: 'School of bigeye trevally' } },
  { file: 'orange-seafan.webp', alt: { th: 'กัลปังหาสีส้ม', en: 'Orange sea fan' } },
  { file: 'jack-school.webp', alt: { th: 'ฝูงปลาหางแข็ง', en: 'School of jacks' } },
  { file: 'eagle-ray-school.webp', alt: { th: 'ฝูงกระเบนนก', en: 'School of eagle rays' } },
  {
    file: 'islands-speedboat.webp',
    alt: { th: 'เรือเร็วกลางหมู่เกาะ', en: 'Speedboat among islands' },
  },
  { file: 'palau-rock-islands.webp', alt: { th: 'หมู่เกาะหินปาเลา', en: 'Palau Rock Islands' } },
  {
    file: 'galapagos-tortoise.webp',
    alt: { th: 'เต่ายักษ์กาลาปากอส', en: 'Galapagos giant tortoise' },
  },
  { file: 'hammerhead.webp', alt: { th: 'ฉลามหัวค้อน', en: 'Hammerhead shark' } },
  { file: 'humpback-calf.webp', alt: { th: 'ลูกวาฬหลังค่อม', en: 'Humpback whale calf' } },
  { file: 'plane-wreck.webp', alt: { th: 'ซากเครื่องบินใต้น้ำ', en: 'Plane wreck' } },
]

export const DIVE_SITES: { key: string; name: L; region: L; description: L; photo?: string }[] = [
  {
    key: 'richelieu',
    name: { th: 'ริเชลิว ร็อค', en: 'Richelieu Rock' },
    region: { th: 'หมู่เกาะสุรินทร์ ทะเลอันดามัน', en: 'Surin Islands, Andaman Sea' },
    description: {
      th: 'กองหินรูปเกือกม้าที่ปกคลุมด้วยดอกไม้ทะเลสีม่วง มีโอกาสพบฉลามวาฬในช่วงต้นปี',
      en: 'A horseshoe-shaped pinnacle covered in purple anemones, with a chance of whale sharks early in the year.',
    },
    photo: 'orange-seafan.webp',
  },
  {
    key: 'kohbon',
    name: { th: 'เกาะบอน', en: 'Koh Bon' },
    region: { th: 'หมู่เกาะสิมิลัน ทะเลอันดามัน', en: 'Similan Islands, Andaman Sea' },
    description: {
      th: 'สันหินใต้น้ำที่มีกระแสน้ำ เป็นจุดที่พบกระเบนราหูบ่อยที่สุดจุดหนึ่งของสิมิลัน',
      en: 'A ridge swept by currents and one of the best spots in the Similans for manta rays.',
    },
    photo: 'manta-diver.webp',
  },
  {
    key: 'elephant',
    name: { th: 'หินหัวช้าง', en: 'Elephant Head Rock' },
    region: { th: 'หมู่เกาะสิมิลัน ทะเลอันดามัน', en: 'Similan Islands, Andaman Sea' },
    description: {
      th: 'กองหินแกรนิตขนาดใหญ่ที่มีช่องลอดและโพรงให้สำรวจ น้ำใส ปลาเยอะ',
      en: 'Giant granite boulders with swim-throughs and caverns, clear water and plenty of fish.',
    },
    photo: 'jack-school.webp',
  },
  {
    key: 'chumphon',
    name: { th: 'กองหินชุมพร (Chumphon Pinnacle)', en: 'Chumphon Pinnacle' },
    region: { th: 'เกาะเต่า อ่าวไทย', en: 'Koh Tao, Gulf of Thailand' },
    description: {
      th: 'กองหินใต้น้ำยอดนิยมของเกาะเต่า มีฝูงปลาสาก ปลาหางแข็ง และบางครั้งพบฉลามวาฬ',
      en: "Koh Tao's favourite pinnacle, with schools of barracuda and jacks and the odd whale shark.",
    },
    photo: 'bigeye-school.webp',
  },
  {
    key: 'sailrock',
    name: { th: 'หินใบ (Sail Rock)', en: 'Sail Rock' },
    region: {
      th: 'ระหว่างเกาะพะงันกับเกาะเต่า อ่าวไทย',
      en: 'Between Koh Phangan and Koh Tao, Gulf of Thailand',
    },
    description: {
      th: 'กองหินโผล่พ้นน้ำกลางทะเล มีปล่องแนวตั้ง (Chimney) ที่นักดำน้ำชอบที่สุด',
      en: 'A lone rock in open water with the famous vertical swim-through "Chimney".',
    },
    photo: 'eagle-ray-school.webp',
  },
]

export const COURSES: {
  slug: string
  padiCode: string
  price: number
  days: number
  title: L
  summary: L
  prerequisites: L[]
  includes: L[]
  photo?: string
}[] = [
  {
    slug: 'padi-open-water',
    padiCode: 'OWD',
    price: 15500,
    days: 3,
    title: { th: 'PADI Open Water Diver', en: 'PADI Open Water Diver' },
    summary: {
      th: 'คอร์สแรกสำหรับมือใหม่ เรียนทฤษฎี ฝึกในน้ำตื้น และดำน้ำในทะเลจริง 4 ไดฟ์ ได้บัตรดำน้ำได้ลึก 18 เมตร',
      en: 'The first course for beginners: theory, confined water and 4 open-water dives. Certifies you to 18 m.',
    },
    prerequisites: [
      { th: 'อายุ 10 ปีขึ้นไป', en: 'Age 10 or over' },
      { th: 'ว่ายน้ำได้ 200 เมตร', en: 'Able to swim 200 m' },
    ],
    includes: [
      { th: 'ค่าบัตร PADI และตำราเรียนออนไลน์', en: 'PADI certification and eLearning' },
      { th: 'อุปกรณ์ดำน้ำครบชุด', en: 'Full scuba equipment' },
      { th: 'ครูฝึกพูดไทย/อังกฤษ', en: 'Thai/English-speaking instructor' },
    ],
    photo: 'diver-green-reef.webp',
  },
  {
    slug: 'padi-advanced-open-water',
    padiCode: 'AOWD',
    price: 12500,
    days: 2,
    title: { th: 'PADI Advanced Open Water Diver', en: 'PADI Advanced Open Water Diver' },
    summary: {
      th: 'ต่อยอดจาก Open Water ด้วย 5 ไดฟ์พิเศษ รวมดำน้ำลึกและนำทางใต้น้ำ ดำได้ลึก 30 เมตร',
      en: 'Five adventure dives including deep and navigation. Certifies you to 30 m.',
    },
    prerequisites: [{ th: 'มีบัตร Open Water', en: 'Open Water certification' }],
    includes: [
      { th: 'ค่าบัตร PADI', en: 'PADI certification' },
      { th: 'อุปกรณ์ดำน้ำครบชุด', en: 'Full scuba equipment' },
    ],
    photo: 'jack-school.webp',
  },
  {
    slug: 'padi-rescue-diver',
    padiCode: 'RD',
    price: 14900,
    days: 3,
    title: { th: 'PADI Rescue Diver', en: 'PADI Rescue Diver' },
    summary: {
      th: 'ฝึกป้องกันและแก้ไขเหตุฉุกเฉินใต้น้ำ คอร์สที่นักดำน้ำหลายคนบอกว่าสนุกและมีประโยชน์ที่สุด',
      en: 'Learn to prevent and manage dive emergencies; many divers call it the most rewarding course.',
    },
    prerequisites: [
      { th: 'มีบัตร Advanced Open Water', en: 'Advanced Open Water certification' },
      { th: 'ผ่าน EFR ภายใน 24 เดือน', en: 'EFR within the last 24 months' },
    ],
    includes: [{ th: 'ค่าบัตร PADI', en: 'PADI certification' }],
  },
  {
    slug: 'padi-divemaster',
    padiCode: 'DM',
    price: 45000,
    days: 21,
    title: { th: 'PADI Divemaster', en: 'PADI Divemaster' },
    summary: {
      th: 'ก้าวแรกสู่นักดำน้ำมืออาชีพ ฝึกงานกับทีม Dive Potato นำทริปจริง',
      en: 'Your first step into professional diving, interning with the Dive Potato team on real trips.',
    },
    prerequisites: [
      { th: 'มีบัตร Rescue Diver และ EFR', en: 'Rescue Diver and EFR' },
      { th: 'มีประสบการณ์อย่างน้อย 40 ไดฟ์', en: 'At least 40 logged dives' },
    ],
    includes: [{ th: 'ค่าธรรมเนียม PADI', en: 'PADI fees' }],
  },
]

export const TRIPS: {
  slug: string
  type: 'daytrip' | 'liveaboard' | 'overseas'
  price: number
  depositPct?: number
  level: 'none' | 'ow' | 'aow'
  title: L
  summary: L
  itinerary: { day: number; title: L; text: L }[]
  includes: L[]
  excludes: L[]
  sites: string[]
  photos: string[]
}[] = [
  {
    slug: 'similan-liveaboard-4d3n',
    type: 'liveaboard',
    price: 26900,
    level: 'ow',
    title: { th: 'ทริปค้างเรือสิมิลัน 4 วัน 3 คืน', en: 'Similan Liveaboard 4D3N' },
    summary: {
      th: 'ดำน้ำ 13 ไดฟ์ที่หมู่เกาะสิมิลัน เกาะบอน เกาะตาชัย และริเชลิว ร็อค พักบนเรือ อาหารครบทุกมื้อ',
      en: '13 dives across the Similans, Koh Bon, Koh Tachai and Richelieu Rock, sleeping on board with all meals.',
    },
    itinerary: [
      {
        day: 1,
        title: { th: 'ออกเดินทางจากทับละมุ', en: 'Depart Thap Lamu' },
        text: {
          th: 'ขึ้นเรือช่วงเย็น บรีฟความปลอดภัย',
          en: 'Board in the evening, safety briefing.',
        },
      },
      {
        day: 2,
        title: { th: 'หมู่เกาะสิมิลัน', en: 'Similan Islands' },
        text: { th: 'ดำน้ำ 4 ไดฟ์ รวมหินหัวช้าง', en: '4 dives including Elephant Head Rock.' },
      },
      {
        day: 3,
        title: { th: 'เกาะบอนและเกาะตาชัย', en: 'Koh Bon and Koh Tachai' },
        text: {
          th: 'ลุ้นกระเบนราหู 4 ไดฟ์ รวมไนท์ไดฟ์',
          en: 'Manta hunting, 4 dives including a night dive.',
        },
      },
      {
        day: 4,
        title: { th: 'ริเชลิว ร็อค', en: 'Richelieu Rock' },
        text: { th: 'ดำน้ำ 2 ไดฟ์ แล้วกลับเข้าฝั่ง', en: '2 dives, then back to port.' },
      },
    ],
    includes: [
      { th: 'ห้องพักบนเรือและอาหารทุกมื้อ', en: 'Cabin and all meals' },
      { th: 'ไกด์ดำน้ำ ถังและน้ำหนัก', en: 'Dive guide, tanks and weights' },
      { th: 'รถรับส่งจากภูเก็ต/เขาหลัก', en: 'Transfers from Phuket/Khao Lak' },
    ],
    excludes: [
      { th: 'ค่าธรรมเนียมอุทยาน', en: 'National park fees' },
      { th: 'อุปกรณ์เช่า', en: 'Rental gear' },
    ],
    sites: ['richelieu', 'kohbon', 'elephant'],
    photos: ['manta-diver.webp', 'orange-seafan.webp'],
  },
  {
    slug: 'koh-tao-daytrip-set',
    type: 'daytrip',
    price: 3900,
    level: 'ow',
    title: { th: 'ทริปดำน้ำเกาะเต่า (เช้าไปเย็นกลับ)', en: 'Koh Tao Day Trip Set' },
    summary: {
      th: 'ดำน้ำ 2 ไดฟ์ที่กองหินชุมพรและหินใบ พร้อมอาหารกลางวันบนเรือ',
      en: '2 dives at Chumphon Pinnacle and Sail Rock with lunch on board.',
    },
    itinerary: [
      {
        day: 1,
        title: { th: 'ออกเรือ 07:00', en: 'Boat leaves 07:00' },
        text: {
          th: 'ไดฟ์ที่ 1 กองหินชุมพร ไดฟ์ที่ 2 หินใบ กลับถึงท่าประมาณ 14:00',
          en: 'Dive 1 Chumphon Pinnacle, dive 2 Sail Rock, back around 14:00.',
        },
      },
    ],
    includes: [
      { th: 'ถัง น้ำหนัก และไกด์', en: 'Tanks, weights and guide' },
      { th: 'อาหารกลางวันและผลไม้', en: 'Lunch and fruit' },
    ],
    excludes: [{ th: 'อุปกรณ์เช่า', en: 'Rental gear' }],
    sites: ['chumphon', 'sailrock'],
    photos: ['bigeye-school.webp'],
  },
  {
    slug: 'koh-lipe-dive-set',
    type: 'daytrip',
    price: 9900,
    level: 'ow',
    title: { th: 'ดำน้ำเกาะหลีเป๊ะ 3 วัน', en: 'Koh Lipe 3-Day Dive Set' },
    summary: {
      th: 'ดำน้ำ 6 ไดฟ์รอบหมู่เกาะอาดัง-ราวี ปะการังอ่อนสีสวยที่สุดฝั่งอันดามันใต้',
      en: '6 dives around the Adang-Rawi islands, home to the best soft corals of the southern Andaman.',
    },
    itinerary: [
      {
        day: 1,
        title: { th: 'วันที่ 1', en: 'Day 1' },
        text: { th: '2 ไดฟ์ รอบเกาะหลีเป๊ะ', en: '2 dives around Koh Lipe' },
      },
      {
        day: 2,
        title: { th: 'วันที่ 2', en: 'Day 2' },
        text: { th: '2 ไดฟ์ เกาะอาดัง', en: '2 dives at Koh Adang' },
      },
      {
        day: 3,
        title: { th: 'วันที่ 3', en: 'Day 3' },
        text: { th: '2 ไดฟ์ กองหินสโตนเฮนจ์', en: '2 dives at Stonehenge' },
      },
    ],
    includes: [{ th: 'ถัง น้ำหนัก ไกด์ และเรือ', en: 'Tanks, weights, guide and boat' }],
    excludes: [{ th: 'ที่พักบนเกาะ', en: 'Island accommodation' }],
    sites: [],
    photos: ['islands-speedboat.webp'],
  },
  {
    slug: 'palau-overseas',
    type: 'overseas',
    price: 89000,
    depositPct: 50,
    level: 'aow',
    title: { th: 'ทริปดำน้ำปาเลา 6 วัน', en: 'Palau Dive Expedition 6 Days' },
    summary: {
      th: 'Blue Corner, German Channel และทะเลสาบแมงกะพรุน กับกรุ๊ปเล็กที่ดูแลโดยทีม Dive Potato',
      en: 'Blue Corner, German Channel and Jellyfish Lake in a small group led by the Dive Potato team.',
    },
    itinerary: [
      {
        day: 1,
        title: { th: 'บินสู่ปาเลา', en: 'Fly to Palau' },
        text: { th: 'เช็กอินโรงแรม', en: 'Hotel check-in' },
      },
      {
        day: 2,
        title: { th: 'ดำน้ำ 4 วัน', en: '4 days of diving' },
        text: { th: 'วันละ 3 ไดฟ์', en: '3 dives a day' },
      },
      {
        day: 6,
        title: { th: 'บินกลับ', en: 'Fly home' },
        text: { th: 'ห้ามดำน้ำ 24 ชม. ก่อนบิน', en: 'No diving 24 h before the flight' },
      },
    ],
    includes: [
      { th: 'ที่พัก 5 คืน', en: '5 nights accommodation' },
      { th: 'ดำน้ำ 12 ไดฟ์', en: '12 dives' },
    ],
    excludes: [{ th: 'ตั๋วเครื่องบิน', en: 'Flights' }],
    sites: [],
    photos: ['palau-rock-islands.webp'],
  },
  {
    slug: 'galapagos-liveaboard',
    type: 'overseas',
    price: 289000,
    depositPct: 50,
    level: 'aow',
    title: { th: 'ทริปค้างเรือกาลาปากอส 8 วัน', en: 'Galapagos Liveaboard 8 Days' },
    summary: {
      th: 'ฉลามหัวค้อนเป็นฝูง สิงโตทะเล และอีกัวน่าทะเล ที่เกาะวูล์ฟและดาร์วิน',
      en: 'Schooling hammerheads, sea lions and marine iguanas at Wolf and Darwin.',
    },
    itinerary: [
      {
        day: 1,
        title: { th: 'ขึ้นเรือที่ซานคริสโตบัล', en: 'Board at San Cristobal' },
        text: { th: 'เช็กไดฟ์', en: 'Check dive' },
      },
      {
        day: 4,
        title: { th: 'วูล์ฟและดาร์วิน', en: 'Wolf and Darwin' },
        text: { th: 'ฉลามหัวค้อน', en: 'Hammerheads' },
      },
    ],
    includes: [{ th: 'ห้องพักบนเรือ อาหาร และดำน้ำ', en: 'Cabin, meals and diving' }],
    excludes: [
      { th: 'ตั๋วเครื่องบิน', en: 'Flights' },
      { th: 'ค่าธรรมเนียมอุทยานกาลาปากอส', en: 'Galapagos park fee' },
    ],
    sites: [],
    photos: ['hammerhead.webp', 'galapagos-tortoise.webp'],
  },
  {
    slug: 'whale-watching-tonga',
    type: 'overseas',
    price: 159000,
    depositPct: 50,
    level: 'none',
    title: { th: 'ว่ายน้ำกับวาฬหลังค่อม ตองกา', en: 'Swim with Humpback Whales, Tonga' },
    summary: {
      th: 'ทริปชมและว่ายน้ำกับวาฬหลังค่อมในฤดูให้นมลูก ไม่ต้องมีบัตรดำน้ำ',
      en: 'Watch and swim with humpback mothers and calves; no dive certification needed.',
    },
    itinerary: [
      {
        day: 1,
        title: { th: 'ถึงวาวาอู', en: 'Arrive Vava’u' },
        text: { th: 'บรีฟกฎการว่ายน้ำกับวาฬ', en: 'Whale-swim briefing' },
      },
      {
        day: 2,
        title: { th: 'ออกเรือ 5 วัน', en: '5 days on the boat' },
        text: { th: 'ตามหาวาฬทุกวัน', en: 'Searching for whales each day' },
      },
    ],
    includes: [{ th: 'เรือและไกด์ที่ได้รับใบอนุญาต', en: 'Licensed boat and guide' }],
    excludes: [{ th: 'ตั๋วเครื่องบิน', en: 'Flights' }],
    sites: [],
    photos: ['humpback-calf.webp'],
  },
]

export const CUSTOMERS: {
  name: string
  email: string
  phone: string
  lineId?: string
  nationality: string
}[] = [
  {
    name: 'ณัฐวุฒิ ศรีสุข',
    email: 'nattawut@example.com',
    phone: '081-000-0001',
    lineId: 'nattawut.s',
    nationality: 'Thai',
  },
  {
    name: 'พิมพ์ชนก วงศ์ทอง',
    email: 'pimchanok@example.com',
    phone: '081-000-0002',
    lineId: 'pim.w',
    nationality: 'Thai',
  },
  {
    name: 'ธนากร แก้วมณี',
    email: 'thanakorn@example.com',
    phone: '081-000-0003',
    nationality: 'Thai',
  },
  {
    name: 'กมลชนก บุญมา',
    email: 'kamonchanok@example.com',
    phone: '081-000-0004',
    lineId: 'kamon.b',
    nationality: 'Thai',
  },
  {
    name: 'ศุภกิจ ทองดี',
    email: 'suppakit@example.com',
    phone: '081-000-0005',
    nationality: 'Thai',
  },
  {
    name: 'อรอุมา จันทร์เพ็ญ',
    email: 'onuma@example.com',
    phone: '081-000-0006',
    lineId: 'onuma.j',
    nationality: 'Thai',
  },
  {
    name: 'วรเมธ สุขสวัสดิ์',
    email: 'woramet@example.com',
    phone: '081-000-0007',
    nationality: 'Thai',
  },
  {
    name: 'ปวีณา รัตนพันธ์',
    email: 'paweena@example.com',
    phone: '081-000-0008',
    lineId: 'paweena.r',
    nationality: 'Thai',
  },
  {
    name: 'Emma Schneider',
    email: 'emma.schneider@example.com',
    phone: '+49 151 0000 0009',
    nationality: 'German',
  },
  {
    name: "Liam O'Connor",
    email: 'liam.oconnor@example.com',
    phone: '+353 85 000 0010',
    nationality: 'Irish',
  },
  {
    name: 'Sofia Rossi',
    email: 'sofia.rossi@example.com',
    phone: '+39 320 000 0011',
    nationality: 'Italian',
  },
  {
    name: 'Kenji Tanaka',
    email: 'kenji.tanaka@example.com',
    phone: '+81 90 0000 0012',
    nationality: 'Japanese',
  },
  {
    name: 'Chloé Martin',
    email: 'chloe.martin@example.com',
    phone: '+33 6 00 00 00 13',
    nationality: 'French',
  },
  {
    name: 'Daniel Kim',
    email: 'daniel.kim@example.com',
    phone: '+82 10 0000 0014',
    nationality: 'Korean',
  },
  {
    name: 'Olivia Brown',
    email: 'olivia.brown@example.com',
    phone: '+61 400 000 015',
    nationality: 'Australian',
  },
]

// Extra people who join the customers' bookings
export const COMPANIONS = [
  'สมศักดิ์ ใจดี',
  'นภัสสร มีสุข',
  'กิตติพงษ์ แสงทอง',
  'จิราพร ศรีงาม',
  'ภูมิ พัฒนกุล',
  'Anna Müller',
  'Tom Walsh',
  'Marco Bianchi',
  'Yuki Sato',
  'Lucas Petit',
  'Mina Park',
  'Jack Wilson',
  'ชนิดา พรหมมา',
  'ธีรวัฒน์ อินทร์แก้ว',
  'Hannah Lee',
  'Noah Smith',
]

// Departures: days from today, what they are for, capacity and boat
export const DEPARTURES: {
  key: string
  offset: number
  length: number
  kind: 'trip' | 'course'
  ref: string
  capacity: number
  boat?: string
  status?: 'open' | 'full' | 'closed'
}[] = [
  {
    key: 'past-similan',
    offset: -12,
    length: 4,
    kind: 'trip',
    ref: 'similan-liveaboard-4d3n',
    capacity: 12,
    boat: 'Potato Explorer',
    status: 'closed',
  },
  {
    key: 'tao-today',
    offset: 0,
    length: 1,
    kind: 'trip',
    ref: 'koh-tao-daytrip-set',
    capacity: 10,
    boat: 'Potato One',
  },
  { key: 'ow-1', offset: 4, length: 3, kind: 'course', ref: 'padi-open-water', capacity: 6 },
  {
    key: 'similan-1',
    offset: 9,
    length: 4,
    kind: 'trip',
    ref: 'similan-liveaboard-4d3n',
    capacity: 12,
    boat: 'Potato Explorer',
  },
  {
    key: 'tao-2',
    offset: 14,
    length: 1,
    kind: 'trip',
    ref: 'koh-tao-daytrip-set',
    capacity: 10,
    boat: 'Potato One',
  },
  {
    key: 'aow-1',
    offset: 20,
    length: 2,
    kind: 'course',
    ref: 'padi-advanced-open-water',
    capacity: 6,
  },
  {
    key: 'lipe-1',
    offset: 25,
    length: 3,
    kind: 'trip',
    ref: 'koh-lipe-dive-set',
    capacity: 10,
    boat: 'Lipe Longtail',
  },
  {
    key: 'similan-2',
    offset: 33,
    length: 4,
    kind: 'trip',
    ref: 'similan-liveaboard-4d3n',
    capacity: 12,
    boat: 'Potato Explorer',
  },
  {
    key: 'rescue-1',
    offset: 40,
    length: 3,
    kind: 'course',
    ref: 'padi-rescue-diver',
    capacity: 4,
    status: 'full',
  },
  { key: 'palau-1', offset: 48, length: 6, kind: 'trip', ref: 'palau-overseas', capacity: 10 },
  {
    key: 'tao-3',
    offset: 60,
    length: 1,
    kind: 'trip',
    ref: 'koh-tao-daytrip-set',
    capacity: 10,
    boat: 'Potato One',
  },
  {
    key: 'galapagos-1',
    offset: 72,
    length: 8,
    kind: 'trip',
    ref: 'galapagos-liveaboard',
    capacity: 8,
  },
  {
    key: 'whales-1',
    offset: 85,
    length: 7,
    kind: 'trip',
    ref: 'whale-watching-tonga',
    capacity: 8,
  },
]

export type FinalStatus =
  | 'hold'
  | 'pending_review'
  | 'deposit_paid'
  | 'paid'
  | 'cancelled'
  | 'refunded'
  | 'completed'
  | 'expired'

export const BOOKINGS: {
  departure: string
  customer: number
  people: number
  status: FinalStatus
  source: 'website' | 'line' | 'phone' | 'walk_in' | 'agent'
  depositVia?: 'omise' | 'slip' | 'transfer'
}[] = [
  {
    departure: 'tao-today',
    customer: 0,
    people: 2,
    status: 'paid',
    source: 'website',
    depositVia: 'omise',
  },
  {
    departure: 'tao-today',
    customer: 1,
    people: 3,
    status: 'deposit_paid',
    source: 'line',
    depositVia: 'slip',
  },
  { departure: 'tao-today', customer: 8, people: 2, status: 'pending_review', source: 'website' },
  {
    departure: 'ow-1',
    customer: 9,
    people: 2,
    status: 'deposit_paid',
    source: 'website',
    depositVia: 'omise',
  },
  { departure: 'ow-1', customer: 2, people: 1, status: 'pending_review', source: 'line' },
  {
    departure: 'similan-1',
    customer: 3,
    people: 4,
    status: 'paid',
    source: 'phone',
    depositVia: 'transfer',
  },
  {
    departure: 'similan-1',
    customer: 10,
    people: 3,
    status: 'deposit_paid',
    source: 'website',
    depositVia: 'omise',
  },
  {
    departure: 'similan-1',
    customer: 4,
    people: 3,
    status: 'deposit_paid',
    source: 'line',
    depositVia: 'slip',
  },
  { departure: 'similan-1', customer: 11, people: 1, status: 'hold', source: 'website' },
  { departure: 'tao-2', customer: 5, people: 2, status: 'pending_review', source: 'line' },
  {
    departure: 'aow-1',
    customer: 12,
    people: 2,
    status: 'paid',
    source: 'walk_in',
    depositVia: 'transfer',
  },
  {
    departure: 'lipe-1',
    customer: 6,
    people: 2,
    status: 'cancelled',
    source: 'website',
    depositVia: 'omise',
  },
  {
    departure: 'lipe-1',
    customer: 13,
    people: 2,
    status: 'refunded',
    source: 'website',
    depositVia: 'omise',
  },
  { departure: 'similan-2', customer: 14, people: 2, status: 'expired', source: 'website' },
  {
    departure: 'rescue-1',
    customer: 7,
    people: 4,
    status: 'paid',
    source: 'line',
    depositVia: 'slip',
  },
  {
    departure: 'palau-1',
    customer: 0,
    people: 6,
    status: 'deposit_paid',
    source: 'agent',
    depositVia: 'transfer',
  },
  {
    departure: 'palau-1',
    customer: 9,
    people: 2,
    status: 'deposit_paid',
    source: 'website',
    depositVia: 'omise',
  },
  { departure: 'tao-3', customer: 1, people: 1, status: 'pending_review', source: 'website' },
  {
    departure: 'galapagos-1',
    customer: 11,
    people: 2,
    status: 'deposit_paid',
    source: 'phone',
    depositVia: 'transfer',
  },
  {
    departure: 'past-similan',
    customer: 4,
    people: 3,
    status: 'completed',
    source: 'line',
    depositVia: 'slip',
  },
  {
    departure: 'past-similan',
    customer: 5,
    people: 2,
    status: 'completed',
    source: 'website',
    depositVia: 'omise',
  },
]

// The status steps a booking walks through, so its timeline and payments look real
export const STATUS_PATH: Record<FinalStatus, FinalStatus[]> = {
  hold: ['hold'],
  expired: ['hold', 'expired'],
  pending_review: ['hold', 'pending_review'],
  deposit_paid: ['hold', 'pending_review', 'deposit_paid'],
  paid: ['hold', 'pending_review', 'deposit_paid', 'paid'],
  completed: ['hold', 'pending_review', 'deposit_paid', 'paid', 'completed'],
  cancelled: ['hold', 'pending_review', 'deposit_paid', 'cancelled'],
  refunded: ['hold', 'pending_review', 'deposit_paid', 'cancelled', 'refunded'],
}

export const RENTAL_ITEMS: { key: string; name: L; pricePerDay: number; stock: number }[] = [
  {
    key: 'set',
    name: { th: 'ชุดดำน้ำครบชุด (BCD + เรกูเลเตอร์)', en: 'Full set (BCD + regulator)' },
    pricePerDay: 500,
    stock: 20,
  },
  {
    key: 'wetsuit',
    name: { th: 'ชุดเว็ทสูท 3 มม.', en: 'Wetsuit 3 mm' },
    pricePerDay: 150,
    stock: 30,
  },
  {
    key: 'computer',
    name: { th: 'ไดฟ์คอมพิวเตอร์', en: 'Dive computer' },
    pricePerDay: 300,
    stock: 12,
  },
  {
    key: 'maskfins',
    name: { th: 'หน้ากากและฟิน', en: 'Mask and fins' },
    pricePerDay: 100,
    stock: 30,
  },
  { key: 'torch', name: { th: 'ไฟฉายดำน้ำ', en: 'Dive torch' }, pricePerDay: 200, stock: 8 },
]

export const PRODUCTS: {
  slug: string
  brand: string
  category: 'mask' | 'fins' | 'wetsuit' | 'computer' | 'accessory'
  title: L
  description: L
  variants: { sku: string; size: string; price: number; stock: number }[]
}[] = [
  {
    slug: 'potato-low-volume-mask',
    brand: 'Dive Potato',
    category: 'mask',
    title: { th: 'หน้ากากดำน้ำ Low Volume', en: 'Low Volume Mask' },
    description: {
      th: 'หน้ากากซิลิโคนนุ่ม เคลียร์น้ำง่าย',
      en: 'Soft silicone skirt, easy to clear.',
    },
    variants: [{ sku: 'DP-MASK-ONE', size: 'One size', price: 1890, stock: 12 }],
  },
  {
    slug: 'open-heel-fins',
    brand: 'Mares',
    category: 'fins',
    title: { th: 'ฟินแบบสวมบู๊ท', en: 'Open-heel fins' },
    description: { th: 'ฟินน้ำหนักเบา เหมาะกับการเดินทาง', en: 'Light fins that travel well.' },
    variants: [
      { sku: 'MR-FIN-S', size: 'S (36-38)', price: 3290, stock: 4 },
      { sku: 'MR-FIN-M', size: 'M (39-41)', price: 3290, stock: 6 },
      { sku: 'MR-FIN-L', size: 'L (42-44)', price: 3290, stock: 3 },
      { sku: 'MR-FIN-XL', size: 'XL (45-47)', price: 3290, stock: 0 },
    ],
  },
  {
    slug: 'wetsuit-3mm',
    brand: 'Aqua Lung',
    category: 'wetsuit',
    title: { th: 'เว็ทสูทแขนยาว 3 มม.', en: '3 mm full wetsuit' },
    description: { th: 'เหมาะกับน้ำทะเลไทยทั้งปี', en: 'Right for Thai waters all year.' },
    variants: [
      { sku: 'AL-WS3-XS', size: 'XS', price: 4590, stock: 2 },
      { sku: 'AL-WS3-S', size: 'S', price: 4590, stock: 5 },
      { sku: 'AL-WS3-M', size: 'M', price: 4590, stock: 5 },
      { sku: 'AL-WS3-L', size: 'L', price: 4590, stock: 4 },
      { sku: 'AL-WS3-XL', size: 'XL', price: 4590, stock: 1 },
    ],
  },
  {
    slug: 'dive-computer-basic',
    brand: 'Suunto',
    category: 'computer',
    title: { th: 'ไดฟ์คอมพิวเตอร์รุ่นเริ่มต้น', en: 'Entry dive computer' },
    description: { th: 'หน้าจออ่านง่าย รองรับไนตรอกซ์', en: 'Easy-to-read screen, nitrox ready.' },
    variants: [{ sku: 'SU-ZOOP-BLK', size: 'One size', price: 12900, stock: 3 }],
  },
]

export const POSTS: {
  slug: string
  category: 'news' | 'tips' | 'travel'
  title: L
  excerpt: L
  body: L[]
  photo?: string
}[] = [
  {
    slug: 'similan-season-opens',
    category: 'news',
    title: { th: 'เปิดฤดูดำน้ำสิมิลัน 2569/70', en: 'Similan season 2026/27 is open' },
    excerpt: {
      th: 'อุทยานแห่งชาติหมู่เกาะสิมิลันเปิดให้ดำน้ำแล้ว ทริปค้างเรือรอบแรกของเราเหลือที่นั่งไม่มาก',
      en: 'The Similan national park is open for diving again, and our first liveaboards are filling up.',
    },
    body: [
      {
        th: 'ฤดูดำน้ำฝั่งอันดามันเริ่มกลางเดือนตุลาคมถึงกลางเดือนพฤษภาคม',
        en: 'The Andaman season runs from mid-October to mid-May.',
      },
      {
        th: 'จองล่วงหน้าเพื่อเลือกห้องพักบนเรือได้ก่อน',
        en: 'Book early to get your pick of cabins.',
      },
    ],
    photo: 'manta-diver.webp',
  },
  {
    slug: 'open-water-checklist',
    category: 'tips',
    title: { th: 'เตรียมตัวก่อนเรียน PADI Open Water', en: 'Getting ready for PADI Open Water' },
    excerpt: {
      th: 'สิ่งที่ควรรู้และเตรียมก่อนวันแรกของคอร์ส ตั้งแต่ eLearning จนถึงแบบสอบถามสุขภาพ',
      en: 'What to know before day one, from eLearning to the medical questionnaire.',
    },
    body: [
      {
        th: 'ทำ eLearning ให้เสร็จก่อนมาเรียน จะได้มีเวลาอยู่ในน้ำมากขึ้น',
        en: 'Finish eLearning before you arrive so you spend more time in the water.',
      },
      {
        th: 'กรอกแบบสอบถามสุขภาพตามจริง ถ้ามีข้อใดตอบว่าใช่ ต้องมีใบรับรองแพทย์',
        en: 'Answer the medical form honestly; any "yes" needs a doctor’s sign-off.',
      },
    ],
    photo: 'diver-green-reef.webp',
  },
  {
    slug: 'gulf-vs-andaman',
    category: 'travel',
    title: {
      th: 'อ่าวไทยหรืออันดามัน ดำน้ำที่ไหนดีช่วงไหน',
      en: 'Gulf or Andaman: where to dive when',
    },
    excerpt: {
      th: 'สรุปฤดูดำน้ำสองฝั่งทะเลไทย เลือกทริปให้ตรงกับช่วงวันหยุด',
      en: 'A quick guide to both Thai coasts so your trip matches your holiday.',
    },
    body: [
      {
        th: 'อ่าวไทย (เกาะเต่า) ดำได้เกือบทั้งปี ดีที่สุดช่วงมีนาคมถึงกันยายน',
        en: 'The Gulf (Koh Tao) is diveable most of the year, best from March to September.',
      },
      {
        th: 'อันดามัน (สิมิลัน) เปิดเฉพาะช่วงตุลาคมถึงพฤษภาคม',
        en: 'The Andaman (Similans) opens only from October to May.',
      },
    ],
    photo: 'islands-speedboat.webp',
  },
]

export const FAQS: {
  category: 'booking' | 'courses' | 'trips' | 'general'
  q: L
  a: L
  order: number
}[] = [
  {
    category: 'booking',
    order: 1,
    q: { th: 'ต้องจ่ายมัดจำเท่าไร', en: 'How much is the deposit?' },
    a: {
      th: 'มัดจำ 30% ของราคา (ทริปต่างประเทศ 50%) ส่วนที่เหลือชำระก่อนวันเดินทาง',
      en: '30% of the price (50% for overseas trips); the balance is due before departure.',
    },
  },
  {
    category: 'courses',
    order: 2,
    q: {
      th: 'ว่ายน้ำไม่เก่ง เรียนดำน้ำได้ไหม',
      en: "I'm not a strong swimmer. Can I still learn?",
    },
    a: {
      th: 'ได้ ขอแค่ลอยตัวได้ 10 นาที และว่ายได้ 200 เมตรแบบไม่จับเวลา',
      en: 'Yes. You need to float for 10 minutes and swim 200 m, untimed.',
    },
  },
  {
    category: 'trips',
    order: 3,
    q: { th: 'ไม่มีอุปกรณ์เป็นของตัวเองต้องทำอย่างไร', en: "What if I don't have my own gear?" },
    a: {
      th: 'เช่าได้ที่ร้าน บอกไซซ์ชุดและรองเท้าตอนจอง เราจะเตรียมไว้ให้',
      en: 'Rent from us. Tell us your suit and shoe size when booking and we will have it ready.',
    },
  },
  {
    category: 'general',
    order: 4,
    q: { th: 'ยกเลิกทริปได้ไหม', en: 'Can I cancel?' },
    a: {
      th: 'ได้ตามนโยบายการยกเลิก ยกเลิกก่อน 30 วันคืนมัดจำเต็มจำนวน',
      en: 'Yes, under our cancellation policy: cancel 30+ days ahead for a full deposit refund.',
    },
  },
]
