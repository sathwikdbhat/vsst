// ============================================================
// VSST — globalCities.js
// 200+ Global Cities with Coordinates, Country, Continent, Types
// Types: PORT, AIRPORT, RAIL, ROAD
// ============================================================

var GLOBAL_CITIES = [

    // ===================== SOUTH ASIA — INDIA =====================
    { name:'Mumbai',            country:'India',          continent:'Asia',     lat:19.0760,  lng:72.8777,  types:['PORT','AIRPORT','RAIL','ROAD'] },
    { name:'Delhi',             country:'India',          continent:'Asia',     lat:28.6139,  lng:77.2090,  types:['AIRPORT','RAIL','ROAD'] },
    { name:'Bengaluru',         country:'India',          continent:'Asia',     lat:12.9716,  lng:77.5946,  types:['AIRPORT','RAIL','ROAD'] },
    { name:'Chennai',           country:'India',          continent:'Asia',     lat:13.0827,  lng:80.2707,  types:['PORT','AIRPORT','RAIL','ROAD'] },
    { name:'Kolkata',           country:'India',          continent:'Asia',     lat:22.5726,  lng:88.3639,  types:['PORT','AIRPORT','RAIL','ROAD'] },
    { name:'Hyderabad',         country:'India',          continent:'Asia',     lat:17.3850,  lng:78.4867,  types:['AIRPORT','RAIL','ROAD'] },
    { name:'Ahmedabad',         country:'India',          continent:'Asia',     lat:23.0225,  lng:72.5714,  types:['AIRPORT','RAIL','ROAD'] },
    { name:'Pune',              country:'India',          continent:'Asia',     lat:18.5204,  lng:73.8567,  types:['AIRPORT','RAIL','ROAD'] },
    { name:'Surat',             country:'India',          continent:'Asia',     lat:21.1702,  lng:72.8311,  types:['PORT','RAIL','ROAD'] },
    { name:'Kochi',             country:'India',          continent:'Asia',     lat:9.9312,   lng:76.2673,  types:['PORT','AIRPORT','RAIL'] },
    { name:'Visakhapatnam',     country:'India',          continent:'Asia',     lat:17.6868,  lng:83.2185,  types:['PORT','AIRPORT','RAIL','ROAD'] },
    { name:'Mundra',            country:'India',          continent:'Asia',     lat:22.8392,  lng:69.7236,  types:['PORT','ROAD'] },
    { name:'Jaipur',            country:'India',          continent:'Asia',     lat:26.9124,  lng:75.7873,  types:['AIRPORT','RAIL','ROAD'] },
    { name:'Lucknow',           country:'India',          continent:'Asia',     lat:26.8467,  lng:80.9462,  types:['AIRPORT','RAIL','ROAD'] },
    { name:'Indore',            country:'India',          continent:'Asia',     lat:22.7196,  lng:75.8577,  types:['AIRPORT','RAIL','ROAD'] },
    { name:'Nagpur',            country:'India',          continent:'Asia',     lat:21.1458,  lng:79.0882,  types:['AIRPORT','RAIL','ROAD'] },
    { name:'Bhopal',            country:'India',          continent:'Asia',     lat:23.2599,  lng:77.4126,  types:['AIRPORT','RAIL','ROAD'] },
    { name:'Amritsar',          country:'India',          continent:'Asia',     lat:31.6340,  lng:74.8723,  types:['AIRPORT','RAIL','ROAD'] },
    { name:'Coimbatore',        country:'India',          continent:'Asia',     lat:11.0168,  lng:76.9558,  types:['AIRPORT','RAIL','ROAD'] },
    { name:'Guwahati',          country:'India',          continent:'Asia',     lat:26.1445,  lng:91.7362,  types:['PORT','AIRPORT','RAIL','ROAD'] },
    { name:'Bhubaneswar',       country:'India',          continent:'Asia',     lat:20.2961,  lng:85.8245,  types:['AIRPORT','RAIL','ROAD'] },
    { name:'Thiruvananthapuram',country:'India',          continent:'Asia',     lat:8.5241,   lng:76.9366,  types:['PORT','AIRPORT','RAIL'] },
    { name:'Mangaluru',         country:'India',          continent:'Asia',     lat:12.9141,  lng:74.8560,  types:['PORT','AIRPORT','ROAD'] },
    { name:'Patna',             country:'India',          continent:'Asia',     lat:25.5941,  lng:85.1376,  types:['AIRPORT','RAIL','ROAD'] },
    { name:'Varanasi',          country:'India',          continent:'Asia',     lat:25.3176,  lng:82.9739,  types:['AIRPORT','RAIL','ROAD'] },
    { name:'Goa (Panaji)',      country:'India',          continent:'Asia',     lat:15.4909,  lng:73.8278,  types:['PORT','AIRPORT','ROAD'] },
    { name:'Shimla',            country:'India',          continent:'Asia',     lat:31.1048,  lng:77.1734,  types:['ROAD'] },
    { name:'Dehradun',          country:'India',          continent:'Asia',     lat:30.3165,  lng:78.0322,  types:['AIRPORT','RAIL','ROAD'] },
    { name:'Ranchi',            country:'India',          continent:'Asia',     lat:23.3441,  lng:85.3096,  types:['AIRPORT','RAIL','ROAD'] },
    { name:'Chandigarh',        country:'India',          continent:'Asia',     lat:30.7333,  lng:76.7794,  types:['AIRPORT','RAIL','ROAD'] },

    // ===================== SOUTH ASIA — OTHERS =====================
    { name:'Colombo',           country:'Sri Lanka',      continent:'Asia',     lat:6.9271,   lng:79.8612,  types:['PORT','AIRPORT','RAIL'] },
    { name:'Dhaka',             country:'Bangladesh',     continent:'Asia',     lat:23.8103,  lng:90.4125,  types:['AIRPORT','RAIL','ROAD'] },
    { name:'Chittagong',        country:'Bangladesh',     continent:'Asia',     lat:22.3569,  lng:91.7832,  types:['PORT','RAIL','ROAD'] },
    { name:'Karachi',           country:'Pakistan',       continent:'Asia',     lat:24.8607,  lng:67.0011,  types:['PORT','AIRPORT','RAIL','ROAD'] },
    { name:'Lahore',            country:'Pakistan',       continent:'Asia',     lat:31.5204,  lng:74.3587,  types:['AIRPORT','RAIL','ROAD'] },
    { name:'Kathmandu',         country:'Nepal',          continent:'Asia',     lat:27.7172,  lng:85.3240,  types:['AIRPORT','ROAD'] },

    // ===================== EAST ASIA =====================
    { name:'Shanghai',          country:'China',          continent:'Asia',     lat:31.2304,  lng:121.4737, types:['PORT','AIRPORT','RAIL'] },
    { name:'Beijing',           country:'China',          continent:'Asia',     lat:39.9042,  lng:116.4074, types:['AIRPORT','RAIL'] },
    { name:'Guangzhou',         country:'China',          continent:'Asia',     lat:23.1291,  lng:113.2644, types:['PORT','AIRPORT','RAIL'] },
    { name:'Shenzhen',          country:'China',          continent:'Asia',     lat:22.5431,  lng:114.0579, types:['PORT','AIRPORT','RAIL'] },
    { name:'Tianjin',           country:'China',          continent:'Asia',     lat:39.3434,  lng:117.3616, types:['PORT','RAIL'] },
    { name:'Qingdao',           country:'China',          continent:'Asia',     lat:36.0671,  lng:120.3826, types:['PORT','RAIL'] },
    { name:'Hong Kong',         country:'China',          continent:'Asia',     lat:22.3193,  lng:114.1694, types:['PORT','AIRPORT','RAIL'] },
    { name:'Ningbo',            country:'China',          continent:'Asia',     lat:29.8683,  lng:121.5440, types:['PORT','RAIL'] },
    { name:'Xiamen',            country:'China',          continent:'Asia',     lat:24.4797,  lng:118.0894, types:['PORT','AIRPORT'] },
    { name:'Wuhan',             country:'China',          continent:'Asia',     lat:30.5928,  lng:114.3055, types:['PORT','RAIL','ROAD'] },
    { name:'Chengdu',           country:'China',          continent:'Asia',     lat:30.5728,  lng:104.0668, types:['AIRPORT','RAIL','ROAD'] },
    { name:'Dalian',            country:'China',          continent:'Asia',     lat:38.9140,  lng:121.6147, types:['PORT','RAIL'] },
    { name:'Tokyo',             country:'Japan',          continent:'Asia',     lat:35.6762,  lng:139.6503, types:['PORT','AIRPORT','RAIL'] },
    { name:'Osaka',             country:'Japan',          continent:'Asia',     lat:34.6937,  lng:135.5023, types:['PORT','AIRPORT','RAIL'] },
    { name:'Yokohama',          country:'Japan',          continent:'Asia',     lat:35.4437,  lng:139.6380, types:['PORT','RAIL'] },
    { name:'Kobe',              country:'Japan',          continent:'Asia',     lat:34.6901,  lng:135.1956, types:['PORT','RAIL'] },
    { name:'Nagoya',            country:'Japan',          continent:'Asia',     lat:35.1815,  lng:136.9066, types:['PORT','AIRPORT','RAIL'] },
    { name:'Busan',             country:'South Korea',    continent:'Asia',     lat:35.1796,  lng:129.0756, types:['PORT','RAIL'] },
    { name:'Seoul',             country:'South Korea',    continent:'Asia',     lat:37.5665,  lng:126.9780, types:['AIRPORT','RAIL'] },
    { name:'Kaohsiung',         country:'Taiwan',         continent:'Asia',     lat:22.6273,  lng:120.3014, types:['PORT','RAIL'] },
    { name:'Taipei',            country:'Taiwan',         continent:'Asia',     lat:25.0330,  lng:121.5654, types:['AIRPORT','RAIL'] },
    { name:'Vladivostok',       country:'Russia',         continent:'Asia',     lat:43.1056,  lng:131.8735, types:['PORT','RAIL'] },

    // ===================== SOUTHEAST ASIA =====================
    { name:'Singapore',         country:'Singapore',      continent:'Asia',     lat:1.3521,   lng:103.8198, types:['PORT','AIRPORT','RAIL'] },
    { name:'Bangkok',           country:'Thailand',       continent:'Asia',     lat:13.7563,  lng:100.5018, types:['PORT','AIRPORT','RAIL'] },
    { name:'Laem Chabang',      country:'Thailand',       continent:'Asia',     lat:13.0819,  lng:100.8830, types:['PORT'] },
    { name:'Jakarta',           country:'Indonesia',      continent:'Asia',     lat:-6.2088,  lng:106.8456, types:['PORT','AIRPORT','RAIL'] },
    { name:'Surabaya',          country:'Indonesia',      continent:'Asia',     lat:-7.2575,  lng:112.7521, types:['PORT','AIRPORT'] },
    { name:'Manila',            country:'Philippines',    continent:'Asia',     lat:14.5995,  lng:120.9842, types:['PORT','AIRPORT'] },
    { name:'Port Klang',        country:'Malaysia',       continent:'Asia',     lat:3.0074,   lng:101.3873, types:['PORT'] },
    { name:'Kuala Lumpur',      country:'Malaysia',       continent:'Asia',     lat:3.1390,   lng:101.6869, types:['AIRPORT','RAIL'] },
    { name:'Ho Chi Minh City',  country:'Vietnam',        continent:'Asia',     lat:10.8231,  lng:106.6297, types:['PORT','AIRPORT'] },
    { name:'Hai Phong',         country:'Vietnam',        continent:'Asia',     lat:20.8449,  lng:106.6881, types:['PORT','RAIL'] },
    { name:'Yangon',            country:'Myanmar',        continent:'Asia',     lat:16.8661,  lng:96.1951,  types:['PORT','AIRPORT'] },
    { name:'Penang',            country:'Malaysia',       continent:'Asia',     lat:5.4141,   lng:100.3288, types:['PORT','AIRPORT'] },

    // ===================== MIDDLE EAST =====================
    { name:'Dubai',             country:'UAE',            continent:'Asia',     lat:25.2048,  lng:55.2708,  types:['PORT','AIRPORT','RAIL'] },
    { name:'Abu Dhabi',         country:'UAE',            continent:'Asia',     lat:24.4539,  lng:54.3773,  types:['PORT','AIRPORT'] },
    { name:'Jebel Ali',         country:'UAE',            continent:'Asia',     lat:24.9857,  lng:55.0606,  types:['PORT'] },
    { name:'Muscat',            country:'Oman',           continent:'Asia',     lat:23.5880,  lng:58.3829,  types:['PORT','AIRPORT'] },
    { name:'Doha',              country:'Qatar',          continent:'Asia',     lat:25.2854,  lng:51.5310,  types:['PORT','AIRPORT'] },
    { name:'Riyadh',            country:'Saudi Arabia',   continent:'Asia',     lat:24.6877,  lng:46.7219,  types:['AIRPORT','RAIL','ROAD'] },
    { name:'Jeddah',            country:'Saudi Arabia',   continent:'Asia',     lat:21.5433,  lng:39.1728,  types:['PORT','AIRPORT'] },
    { name:'Kuwait City',       country:'Kuwait',         continent:'Asia',     lat:29.3759,  lng:47.9774,  types:['PORT','AIRPORT'] },
    { name:'Istanbul',          country:'Turkey',         continent:'Europe',   lat:41.0082,  lng:28.9784,  types:['PORT','AIRPORT','RAIL'] },
    { name:'Bandar Abbas',      country:'Iran',           continent:'Asia',     lat:27.1832,  lng:56.2666,  types:['PORT','ROAD'] },
    { name:'Djibouti',          country:'Djibouti',       continent:'Africa',   lat:11.5886,  lng:43.1452,  types:['PORT','AIRPORT'] },

    // ===================== EUROPE =====================
    { name:'Rotterdam',         country:'Netherlands',    continent:'Europe',   lat:51.9244,  lng:4.4777,   types:['PORT','RAIL'] },
    { name:'Hamburg',           country:'Germany',        continent:'Europe',   lat:53.5753,  lng:10.0153,  types:['PORT','RAIL'] },
    { name:'Antwerp',           country:'Belgium',        continent:'Europe',   lat:51.2194,  lng:4.4025,   types:['PORT','RAIL'] },
    { name:'London',            country:'United Kingdom', continent:'Europe',   lat:51.5074,  lng:-0.1278,  types:['PORT','AIRPORT','RAIL'] },
    { name:'Felixstowe',        country:'United Kingdom', continent:'Europe',   lat:51.9588,  lng:1.3517,   types:['PORT'] },
    { name:'Amsterdam',         country:'Netherlands',    continent:'Europe',   lat:52.3676,  lng:4.9041,   types:['PORT','AIRPORT','RAIL'] },
    { name:'Frankfurt',         country:'Germany',        continent:'Europe',   lat:50.1109,  lng:8.6821,   types:['AIRPORT','RAIL'] },
    { name:'Berlin',            country:'Germany',        continent:'Europe',   lat:52.5200,  lng:13.4050,  types:['AIRPORT','RAIL'] },
    { name:'Munich',            country:'Germany',        continent:'Europe',   lat:48.1351,  lng:11.5820,  types:['AIRPORT','RAIL'] },
    { name:'Paris',             country:'France',         continent:'Europe',   lat:48.8566,  lng:2.3522,   types:['AIRPORT','RAIL'] },
    { name:'Le Havre',          country:'France',         continent:'Europe',   lat:49.4944,  lng:0.1079,   types:['PORT','RAIL'] },
    { name:'Marseille',         country:'France',         continent:'Europe',   lat:43.2965,  lng:5.3698,   types:['PORT','RAIL'] },
    { name:'Lyon',              country:'France',         continent:'Europe',   lat:45.7640,  lng:4.8357,   types:['RAIL','ROAD'] },
    { name:'Barcelona',         country:'Spain',          continent:'Europe',   lat:41.3851,  lng:2.1734,   types:['PORT','AIRPORT','RAIL'] },
    { name:'Madrid',            country:'Spain',          continent:'Europe',   lat:40.4168,  lng:-3.7038,  types:['AIRPORT','RAIL'] },
    { name:'Algeciras',         country:'Spain',          continent:'Europe',   lat:36.1274,  lng:-5.4533,  types:['PORT'] },
    { name:'Lisbon',            country:'Portugal',       continent:'Europe',   lat:38.7223,  lng:-9.1393,  types:['PORT','AIRPORT','RAIL'] },
    { name:'Genoa',             country:'Italy',          continent:'Europe',   lat:44.4056,  lng:8.9463,   types:['PORT','RAIL'] },
    { name:'Naples',            country:'Italy',          continent:'Europe',   lat:40.8522,  lng:14.2681,  types:['PORT','RAIL'] },
    { name:'Rome',              country:'Italy',          continent:'Europe',   lat:41.9028,  lng:12.4964,  types:['AIRPORT','RAIL'] },
    { name:'Milan',             country:'Italy',          continent:'Europe',   lat:45.4654,  lng:9.1859,   types:['AIRPORT','RAIL'] },
    { name:'Piraeus',           country:'Greece',         continent:'Europe',   lat:37.9426,  lng:23.6462,  types:['PORT','RAIL'] },
    { name:'Gioia Tauro',       country:'Italy',          continent:'Europe',   lat:38.4282,  lng:15.8999,  types:['PORT'] },
    { name:'Brussels',          country:'Belgium',        continent:'Europe',   lat:50.8503,  lng:4.3517,   types:['AIRPORT','RAIL'] },
    { name:'Vienna',            country:'Austria',        continent:'Europe',   lat:48.2082,  lng:16.3738,  types:['AIRPORT','RAIL'] },
    { name:'Warsaw',            country:'Poland',         continent:'Europe',   lat:52.2297,  lng:21.0122,  types:['AIRPORT','RAIL'] },
    { name:'Gdansk',            country:'Poland',         continent:'Europe',   lat:54.3520,  lng:18.6466,  types:['PORT','RAIL'] },
    { name:'Stockholm',         country:'Sweden',         continent:'Europe',   lat:59.3293,  lng:18.0686,  types:['PORT','AIRPORT','RAIL'] },
    { name:'Gothenburg',        country:'Sweden',         continent:'Europe',   lat:57.7089,  lng:11.9746,  types:['PORT','RAIL'] },
    { name:'Oslo',              country:'Norway',         continent:'Europe',   lat:59.9139,  lng:10.7522,  types:['PORT','AIRPORT','RAIL'] },
    { name:'Copenhagen',        country:'Denmark',        continent:'Europe',   lat:55.6761,  lng:12.5683,  types:['PORT','AIRPORT','RAIL'] },
    { name:'Helsinki',          country:'Finland',        continent:'Europe',   lat:60.1699,  lng:24.9384,  types:['PORT','AIRPORT','RAIL'] },
    { name:'Dublin',            country:'Ireland',        continent:'Europe',   lat:53.3498,  lng:-6.2603,  types:['PORT','AIRPORT'] },
    { name:'Zurich',            country:'Switzerland',    continent:'Europe',   lat:47.3769,  lng:8.5417,   types:['AIRPORT','RAIL'] },

    // ===================== AFRICA =====================
    { name:'Port Said',         country:'Egypt',          continent:'Africa',   lat:31.2565,  lng:32.2841,  types:['PORT'] },
    { name:'Alexandria',        country:'Egypt',          continent:'Africa',   lat:31.2001,  lng:29.9187,  types:['PORT','RAIL'] },
    { name:'Casablanca',        country:'Morocco',        continent:'Africa',   lat:33.5731,  lng:-7.5898,  types:['PORT','AIRPORT','RAIL'] },
    { name:'Lagos',             country:'Nigeria',        continent:'Africa',   lat:6.5244,   lng:3.3792,   types:['PORT','AIRPORT'] },
    { name:'Abidjan',           country:'Ivory Coast',    continent:'Africa',   lat:5.3599,   lng:-4.0083,  types:['PORT','AIRPORT'] },
    { name:'Accra',             country:'Ghana',          continent:'Africa',   lat:5.6037,   lng:-0.1870,  types:['PORT','AIRPORT'] },
    { name:'Dakar',             country:'Senegal',        continent:'Africa',   lat:14.7167,  lng:-17.4677, types:['PORT','AIRPORT'] },
    { name:'Mombasa',           country:'Kenya',          continent:'Africa',   lat:-4.0435,  lng:39.6682,  types:['PORT','RAIL'] },
    { name:'Nairobi',           country:'Kenya',          continent:'Africa',   lat:-1.2921,  lng:36.8219,  types:['AIRPORT','RAIL','ROAD'] },
    { name:'Dar es Salaam',     country:'Tanzania',       continent:'Africa',   lat:-6.7924,  lng:39.2083,  types:['PORT','RAIL'] },
    { name:'Durban',            country:'South Africa',   continent:'Africa',   lat:-29.8587, lng:31.0218,  types:['PORT','RAIL'] },
    { name:'Cape Town',         country:'South Africa',   continent:'Africa',   lat:-33.9249, lng:18.4241,  types:['PORT','AIRPORT','RAIL'] },
    { name:'Johannesburg',      country:'South Africa',   continent:'Africa',   lat:-26.2041, lng:28.0473,  types:['AIRPORT','RAIL','ROAD'] },
    { name:'Luanda',            country:'Angola',         continent:'Africa',   lat:-8.8383,  lng:13.2344,  types:['PORT','AIRPORT'] },
    { name:'Tema',              country:'Ghana',          continent:'Africa',   lat:5.6234,   lng:0.0162,   types:['PORT'] },

    // ===================== NORTH AMERICA =====================
    { name:'New York',          country:'USA',            continent:'Americas', lat:40.7128,  lng:-74.0060, types:['PORT','AIRPORT','RAIL'] },
    { name:'Los Angeles',       country:'USA',            continent:'Americas', lat:34.0522,  lng:-118.2437,types:['PORT','AIRPORT','RAIL'] },
    { name:'Long Beach',        country:'USA',            continent:'Americas', lat:33.7701,  lng:-118.1937,types:['PORT'] },
    { name:'Chicago',           country:'USA',            continent:'Americas', lat:41.8781,  lng:-87.6298, types:['PORT','AIRPORT','RAIL'] },
    { name:'Houston',           country:'USA',            continent:'Americas', lat:29.7604,  lng:-95.3698, types:['PORT','AIRPORT','RAIL'] },
    { name:'Seattle',           country:'USA',            continent:'Americas', lat:47.6062,  lng:-122.3321,types:['PORT','AIRPORT','RAIL'] },
    { name:'Miami',             country:'USA',            continent:'Americas', lat:25.7617,  lng:-80.1918, types:['PORT','AIRPORT'] },
    { name:'Savannah',          country:'USA',            continent:'Americas', lat:32.0835,  lng:-81.0998, types:['PORT','RAIL'] },
    { name:'New Orleans',       country:'USA',            continent:'Americas', lat:29.9511,  lng:-90.0715, types:['PORT','RAIL'] },
    { name:'Baltimore',         country:'USA',            continent:'Americas', lat:39.2904,  lng:-76.6122, types:['PORT','RAIL'] },
    { name:'Boston',            country:'USA',            continent:'Americas', lat:42.3601,  lng:-71.0589, types:['PORT','AIRPORT','RAIL'] },
    { name:'Toronto',           country:'Canada',         continent:'Americas', lat:43.6532,  lng:-79.3832, types:['PORT','AIRPORT','RAIL'] },
    { name:'Vancouver',         country:'Canada',         continent:'Americas', lat:49.2827,  lng:-123.1207,types:['PORT','AIRPORT','RAIL'] },
    { name:'Montreal',          country:'Canada',         continent:'Americas', lat:45.5017,  lng:-73.5673, types:['PORT','AIRPORT','RAIL'] },
    { name:'Mexico City',       country:'Mexico',         continent:'Americas', lat:19.4326,  lng:-99.1332, types:['AIRPORT','RAIL','ROAD'] },
    { name:'Manzanillo',        country:'Mexico',         continent:'Americas', lat:19.0527,  lng:-104.3142,types:['PORT'] },
    { name:'Panama City',       country:'Panama',         continent:'Americas', lat:8.9824,   lng:-79.5199, types:['PORT','AIRPORT'] },
    { name:'Kingston',          country:'Jamaica',        continent:'Americas', lat:17.9970,  lng:-76.7936, types:['PORT','AIRPORT'] },

    // ===================== SOUTH AMERICA =====================
    { name:'São Paulo',         country:'Brazil',         continent:'Americas', lat:-23.5505, lng:-46.6333, types:['AIRPORT','RAIL','ROAD'] },
    { name:'Santos',            country:'Brazil',         continent:'Americas', lat:-23.9618, lng:-46.3322, types:['PORT','RAIL'] },
    { name:'Rio de Janeiro',    country:'Brazil',         continent:'Americas', lat:-22.9068, lng:-43.1729, types:['PORT','AIRPORT'] },
    { name:'Buenos Aires',      country:'Argentina',      continent:'Americas', lat:-34.6037, lng:-58.3816, types:['PORT','AIRPORT','RAIL'] },
    { name:'Santiago',          country:'Chile',          continent:'Americas', lat:-33.4489, lng:-70.6693, types:['AIRPORT','RAIL','ROAD'] },
    { name:'Valparaíso',        country:'Chile',          continent:'Americas', lat:-33.0472, lng:-71.6127, types:['PORT'] },
    { name:'Lima',              country:'Peru',           continent:'Americas', lat:-12.0464, lng:-77.0428, types:['AIRPORT','RAIL','ROAD'] },
    { name:'Callao',            country:'Peru',           continent:'Americas', lat:-12.0566, lng:-77.1482, types:['PORT'] },
    { name:'Bogotá',            country:'Colombia',       continent:'Americas', lat:4.7110,   lng:-74.0721, types:['AIRPORT','ROAD'] },
    { name:'Cartagena',         country:'Colombia',       continent:'Americas', lat:10.3910,  lng:-75.4794, types:['PORT','AIRPORT'] },
    { name:'Guayaquil',         country:'Ecuador',        continent:'Americas', lat:-2.1962,  lng:-79.8862, types:['PORT','AIRPORT'] },

    // ===================== OCEANIA =====================
    { name:'Sydney',            country:'Australia',      continent:'Oceania',  lat:-33.8688, lng:151.2093, types:['PORT','AIRPORT','RAIL'] },
    { name:'Melbourne',         country:'Australia',      continent:'Oceania',  lat:-37.8136, lng:144.9631, types:['PORT','AIRPORT','RAIL'] },
    { name:'Brisbane',          country:'Australia',      continent:'Oceania',  lat:-27.4698, lng:153.0251, types:['PORT','AIRPORT','RAIL'] },
    { name:'Perth',             country:'Australia',      continent:'Oceania',  lat:-31.9505, lng:115.8605, types:['PORT','AIRPORT'] },
    { name:'Adelaide',          country:'Australia',      continent:'Oceania',  lat:-34.9285, lng:138.6007, types:['PORT','AIRPORT','RAIL'] },
    { name:'Port Hedland',      country:'Australia',      continent:'Oceania',  lat:-20.3109, lng:118.5994, types:['PORT'] },
    { name:'Auckland',          country:'New Zealand',    continent:'Oceania',  lat:-36.8509, lng:174.7645, types:['PORT','AIRPORT'] },
    { name:'Tauranga',          country:'New Zealand',    continent:'Oceania',  lat:-37.6870, lng:176.1654, types:['PORT'] }
];

// ============================================================
// HELPER FUNCTIONS
// ============================================================

// Filter cities by transport mode
function getCitiesForMode(mode) {
    var typeMap = {
        'TRUCK': 'ROAD',
        'SHIP':  'PORT',
        'PLANE': 'AIRPORT',
        'TRAIN': 'RAIL'
    };
    var required = typeMap[mode] || 'ROAD';
    return GLOBAL_CITIES.filter(function (c) {
        return c.types.indexOf(required) >= 0;
    });
}

// Build a searchable <select> for a given mode
function buildGlobalCityDropdown(selectId, defaultCityName, mode) {
    var sel = document.getElementById(selectId);
    if (!sel) return;

    var cities = mode ? getCitiesForMode(mode) : GLOBAL_CITIES;

    // Group by continent
    var grouped = {};
    cities.forEach(function (c) {
        if (!grouped[c.continent]) grouped[c.continent] = [];
        grouped[c.continent].push(c);
    });

    // Sort continents
    var continentOrder = ['Asia', 'Europe', 'Americas', 'Africa', 'Oceania'];
    sel.innerHTML = '<option value="">-- Select City --</option>';

    continentOrder.forEach(function (continent) {
        if (!grouped[continent] || grouped[continent].length === 0) return;
        var grp = document.createElement('optgroup');
        grp.label = continent;

        grouped[continent]
            .sort(function (a, b) { return a.name.localeCompare(b.name); })
            .forEach(function (city) {
                var opt = document.createElement('option');
                opt.value       = city.name;
                opt.dataset.lat = city.lat;
                opt.dataset.lng = city.lng;
                opt.dataset.country = city.country;
                opt.dataset.continent = city.continent;
                opt.textContent = city.name + ', ' + city.country;
                if (defaultCityName && city.name === defaultCityName) opt.selected = true;
                grp.appendChild(opt);
            });

        sel.appendChild(grp);
    });
}

// Get city object by name
function getGlobalCity(name) {
    return GLOBAL_CITIES.find(function (c) { return c.name === name; }) || null;
}

// Get hint text for a city select
function getGlobalCityHint(selectId) {
    var sel = document.getElementById(selectId);
    if (!sel) return '';
    var opt = sel.options[sel.selectedIndex];
    if (!opt || !opt.dataset.lat) return '';
    return opt.dataset.lat + '° · ' + opt.dataset.lng + '° — ' +
        opt.dataset.country + ' · ' + opt.dataset.continent;
}