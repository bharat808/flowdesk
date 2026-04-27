// import.js — Run ONCE to:
//   1. Drop all existing entries from MongoDB
//   2. Import historical payout data
//   3. Trigger full sheet resync
//
// Usage: node import.js

require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/flowdesk';

const entrySchema = new mongoose.Schema({
  Email: { type: String, default: '' },
  SubmittedBy: { type: String, default: '' },
  AccountId: { type: String, default: '' },
  X: { type: String, default: '' },
  Insta: { type: String, default: '' },
  RajasApproval: { type: String, default: '' },
  RajasBy: { type: String, default: '' },
  RajasTime: { type: String, default: '' },
  RajasRejectReason: { type: String, default: '' },
  RajasRemark: { type: String, default: '' },
  OpsApproval: { type: String, default: '' },
  OpsBy: { type: String, default: '' },
  OpsTime: { type: String, default: '' },
  OpsRemark: { type: String, default: '' },
  NainaApproval: { type: String, default: '' },
  NainaBy: { type: String, default: '' },
  NainaTime: { type: String, default: '' },
  NainaRejectReason: { type: String, default: '' },
  NainaRemark: { type: String, default: '' },
  DiscountCode: { type: String, default: '' },
  DiscountUsed: { type: String, default: '' },
  BonusPct: { type: String, default: '' },
  BonusStatus: { type: String, default: '' },
  OpsRejectedBack: { type: Boolean, default: false },
}, { timestamps: true });

const Entry = mongoose.model('Entry', entrySchema);

// ── Historical data from the payout sheet ──
// All marked fully approved (Rajas + Ops + Naina = Approved)
const APPROVED_BY = 'System (Import)';
const APPROVED_TIME = new Date().toISOString();

const historicalData = [
  { date: '2025-12-18', name: 'Charles Fehlandt',              email: 'oliver.fehlandt@gmail.com',       code: 'OLIVER90',  budget: '449.1',  x: '', insta: '' },
  { date: '2025-12-23', name: 'Wade Maurice Johnson',          email: 'Mojowjohnson@gmail.com',           code: 'WADE90',    budget: '449.1',  x: '', insta: '' },
  { date: '2025-12-25', name: 'David Maier',                   email: 'dmaier32@gmail.com',               code: 'DAVID90',   budget: '359.1',  x: '', insta: '' },
  { date: '2025-12-24', name: 'Abdul Haziq Abdul Jalil',       email: 'haziqajw1812@gmail.com',           code: 'ABDUL90',   budget: '494.1',  x: '', insta: '' },
  { date: '2025-12-29', name: 'Nayeem Lokhandwala',            email: 'meeyan@yahoo.com',                 code: 'NAYEEM90',  budget: '584.1',  x: '', insta: '' },
  { date: '2025-12-29', name: 'Yanaki Bitsin',                 email: 'ybitsin@gmail.com',                code: 'BIT90',     budget: '449.1',  x: '', insta: '' },
  { date: '2025-12-31', name: 'Jabari Graham',                 email: 'jabarigraham8@gmail.com',          code: 'JABARI90',  budget: '494.1',  x: '', insta: '' },
  { date: '2026-01-02', name: 'David Robins',                  email: 'drobins6209@gmail.com',            code: 'DROBINS90', budget: '449.1',  x: '', insta: '' },
  { date: '2026-01-09', name: 'Bingjie Zhang',                 email: 'bz31@hotmail.com',                 code: 'CLAIRE90',  budget: '494.1',  x: '', insta: '' },
  { date: '2026-01-15', name: 'Geoffrey Williams',             email: 'geoffrey.williams@daltokcapital.com', code: 'GEOFFREY70', budget: '384.3', x: '', insta: '' },
  { date: '2026-01-15', name: 'Kristjan Ornik',                email: 'kristjan.si@hotmail.com',          code: 'KRISTJAN70', budget: '349.3', x: '', insta: '' },
  { date: '2026-01-27', name: 'Jabari Graham',                 email: 'jabarigraham8@gmail.com',          code: 'JABARI70',  budget: '384.3',  x: '', insta: '' },
  { date: '2026-01-28', name: 'Sumeet Pawar',                  email: 'sumeet.pawar033@gmail.com',        code: 'SUMEET70',  budget: '104.3',  x: '', insta: '' },
  { date: '2026-02-02', name: 'Samuel Vickers',                email: 'sam_vickers@hotmail.com',          code: 'SAM90',     budget: '494.1',  x: '', insta: '' },
  { date: '2026-02-03', name: 'Guy Kibble',                    email: 'guy@gfkelectrical.co.uk',          code: 'GUY70',     budget: '349.3',  x: '', insta: '' },
  { date: '2026-02-05', name: 'Marco Halper',                  email: 'fortune500@yahoo.com',             code: 'MARCO70',   budget: '349.3',  x: '', insta: '' },
  { date: '2026-02-05', name: 'Nimrod',                        email: 'nimrodmalomane@gmail.com',         code: 'NIMROD70',  budget: '96.6',   x: '', insta: '' },
  { date: '2026-02-16', name: 'Andy Phuc',                     email: 'phuckhv@icloud.com',               code: 'ANDY70',    budget: '96.6',   x: '', insta: '' },
  { date: '2026-02-16', name: 'Pritesh Koshti',                email: 'koshtipritesh93@yahoo.com',        code: 'PRITESH70', budget: '54.6',   x: '', insta: '' },
  { date: '2026-02-17', name: 'Kefilwe Aboneng',               email: 'abonengkefilwe@gmail.com',         code: 'KEFILWE70', budget: '96.6',   x: '', insta: '' },
  { date: '2026-02-19', name: 'Saeed Warsame',                 email: 'saeedsaleban@gmail.com',           code: 'SAEED70',   budget: '279.3',  x: '', insta: '' },
  { date: '2026-02-24', name: 'Daniel',                        email: 'dfmcapital@gmail.com',             code: 'DANIEL70',  budget: '349.3',  x: '', insta: '' },
  { date: '2026-03-04', name: 'Nahidur',                       email: 'nahidrezanahin@gmail.com',         code: 'NAHIDUR100', budget: '139.3', x: '', insta: '' },
  { date: '2026-03-04', name: 'Rebar',                         email: 'rebarforex@gmail.com',             code: 'REBAR70',   budget: '349.3',  x: '', insta: '' },
  { date: '2026-03-05', name: 'Theophiles Devraj',             email: 'devrajtheo@gmail.com',             code: 'THEO70',    budget: '384.3',  x: '', insta: '' },
  { date: '2026-03-11', name: 'Andras Kovacs',                 email: 'kovacsandris29@gmail.com',         code: 'ANDRAS70',  budget: '384.3',  x: '', insta: '' },
  { date: '2026-03-11', name: 'Mohammed Dahiru Buhari',        email: 'eduforbuhari@gmail.com',           code: 'EDU70',     budget: '26.6',   x: '', insta: '' },
  { date: '2026-03-12', name: 'Joao Sena',                     email: 'joao.a.sena@gmail.com',            code: 'JOAO70',    budget: '349.3',  x: '', insta: '' },
  { date: '2026-03-13', name: 'Joao Sena (2)',                 email: 'joao.a.sena@gmail.com',            code: 'JOAO70',    budget: '329.34', x: '', insta: '' },
  { date: '2026-03-16', name: 'Eduardo Cruz',                  email: 'ecruzgbm@gmail.com',               code: 'EDUARDO70', budget: '384.3',  x: '', insta: '' },
  { date: '2026-03-17', name: 'Timothy Devraj',                email: 'timothydevraj57@gmail.com',        code: 'TIM70',     budget: '384.3',  x: 'https://x.com/Tim132910085409/status/2033530168434688040?s=20', insta: 'https://www.instagram.com/p/DV8j80vCEPN/' },
  { date: '2026-03-19', name: 'Paarth Upmanew',                email: 'qtradingacc@gmail.com',            code: 'PAARTH70',  budget: '362.34', x: '', insta: '' },
  { date: '2026-03-19', name: 'Sarath Chandran Thenanchery',   email: 'chandranin4u@yahoo.com',           code: 'SARATH70',  budget: '384.3',  x: '', insta: '' },
  { date: '2026-03-20', name: 'Hidayat Ustadi',                email: 'ayahsheza@gmail.com',              code: 'HIDAYAT70', budget: '384.3',  x: 'https://x.com/blekethekkk/status/2034394971604922370', insta: 'https://www.instagram.com/p/DWCI-52AQPi/' },
  { date: '2026-03-20', name: 'Idris Aruna',                   email: 'kellyscottscottkelly@gmail.com',   code: 'IDRIS70',   budget: '111.3',  x: '', insta: 'https://www.instagram.com/p/DWCJ2NGiESa/' },
  { date: '2026-03-25', name: 'Kenneth Lo',                    email: 'kennethlojitkin@gmail.com',        code: 'KENNETH70', budget: '91.08',  x: 'https://x.com/UniqueFever94/status/2036458900040589455', insta: 'https://www.instagram.com/p/DWSRrm5kpnx/' },
  { date: '2026-03-25', name: 'Van Nguyen',                    email: 'nguyenanhvanhy6699@gmail.com',     code: 'VAN70',     budget: '489.02', x: 'https://x.com/van_anh81136/status/2036636083283464541?s=20', insta: 'https://www.instagram.com/p/DWN_hMhGbML/' },
  { date: '2026-03-25', name: 'Nguyen Van Hau',                email: 'mr.nguyenvanhau.net@gmail.com',    code: 'HAU70',     budget: '280',    x: 'https://x.com/HauGroup88/status/2036703591491355073', insta: 'https://www.instagram.com/p/DWTHuO1CXLD/' },
  { date: '2026-03-26', name: 'Adam',                          email: 'adamabdulmuiz1122@gmail.com',      code: 'ADAM70',    budget: '118.3',  x: 'https://x.com/lemonteaninja/status/2037170499466219839?s=46', insta: 'https://www.instagram.com/p/DWWJASGjQzG/' },
  { date: '2026-03-27', name: 'Stephen',                       email: 'cryptogenius74@gmail.com',         code: 'STEPHEN70', budget: '349.3',  x: '', insta: 'https://www.instagram.com/p/DWWiUScjOQG/' },
  { date: '2026-03-27', name: 'Jabir Abdulsalam',              email: 'jabirabdulsalam27@gmail.com',      code: 'JABIR70',   budget: '90.3',   x: 'https://x.com/i/status/2037548427186213070', insta: 'https://www.instagram.com/p/DWZIXmPiOXC/' },
  { date: '2026-03-03', name: 'Ying Jie Wong',                 email: 'conage123@gmail.com',              code: 'WONG70',    budget: '54.6',   x: '', insta: '' },
  { date: '2026-03-31', name: 'Ferdinand Dike',                email: 'Ferdinanddike@gmail.com',          code: 'DIKE70',    budget: '286.3',  x: 'https://x.com/e_bvcks/status/2038894832135950763?s=46', insta: 'https://www.instagram.com/reel/DWg7_6uCnp8/' },
  { date: '2026-04-02', name: 'Isaac Kyanjo',                  email: 'ikyanjo1@gmail.com',               code: 'ISAAC70',   budget: '286.3',  x: 'https://x.com/zacprofits25/status/2039451083102118053?s=20', insta: 'https://www.instagram.com/isaackyanjo/p/DWmsAI8iE0sgYNvmN-jWiyYc4NhxS37bDaxXY00/' },
  { date: '2026-04-06', name: 'Dang Tran Thuc Nguyen',         email: 'dangtranthucnguyen@gmail.com',     code: 'DANG70',    budget: '286.3',  x: 'https://x.com/trandang6688/status/2039979348154081633?s=46', insta: 'https://www.instagram.com/p/DWqZRhuEeix/' },
  { date: '2026-04-09', name: 'Alage',                         email: 'alagemohamedkanneh1999@gmail.com', code: 'ALAGE70',   budget: '286.3',  x: 'https://x.com/AlageKanneh/status/2041553639181853055/photo/1', insta: 'https://www.instagram.com/p/DW1ldvjlfnX/' },
  { date: '2026-04-09', name: 'Minh',                          email: 'tienminh6666@gmail.com',           code: 'MINH70',    budget: '349.3',  x: 'https://x.com/minhnguyen66666/status/2041893380091998250?s=20', insta: 'https://www.instagram.com/p/DW3_y73EV6M/' },
  { date: '2026-04-09', name: 'Henok Tekie',                   email: 'henniitekie@gmail.com',            code: 'HENOK70',   budget: '349.3',  x: 'https://x.com/enoktekie7/status/2039659259802345936?s=46', insta: 'https://www.instagram.com/p/DWoHQLyEY-H/' },
  { date: '2026-04-09', name: 'Tibor Sturm',                   email: 'herrsturm21@gmail.com',            code: 'TIBOR70',   budget: '195.3',  x: 'https://x.com/i/status/2040138561790308781', insta: 'https://www.instagram.com/p/DWrc4yciPsa/' },
  { date: '2026-04-09', name: 'Waheed Ahmed',                  email: 'wademotors1@gmail.com',            code: 'WAHEED70',  budget: '244.3',  x: 'https://x.com/waheedo9oy/status/2041602455507509525?s=46', insta: 'https://www.instagram.com/p/DWzZtWpiDu4/' },
  { date: '2026-04-09', name: 'Bambiri Daniel Rostas',         email: 'cjrecords2k@gmail.com',            code: 'CJ70',      budget: '69.3',   x: 'https://x.com/DanielRostasM/status/2041419679713952155', insta: 'https://www.instagram.com/erikvantools/' },
  { date: '2026-04-09', name: 'Lufuno Mamburu',                email: 'mamburulb@gmail.com',              code: 'LUFUNO70',  budget: '181.3',  x: 'https://x.com/i/status/2041421374053319057', insta: 'https://www.instagram.com/p/DW0rHf4jLjy/' },
  { date: '2026-04-09', name: 'Pedro Zandamela',               email: 'pedrozandamela@lordzanda.com',     code: 'PEDRO70',   budget: '286.3',  x: 'https://x.com/dlord26_/status/2041610877875458293?s=20', insta: 'https://www.instagram.com/p/DW1ZLsWDRlQ/' },
  { date: '2026-04-13', name: 'Quang Trung Le',                email: 'quangtrung.mkt@gmail.com',         code: 'QUAN70',    budget: '160.3',  x: 'https://x.com/vn_quang11334/status/2042157222512488791?s=20', insta: 'https://www.instagram.com/p/DW527ZpEdW4/' },
  { date: '2026-04-13', name: 'Erisson Moreira Carneiro',      email: 'erissonpf@gmail.com',              code: 'ERISSON70', budget: '69.3',   x: 'https://x.com/i/status/2042810946180059495', insta: 'https://www.instagram.com/p/DW-hQfvjp8b/' },
  { date: '2026-04-15', name: 'Steven Ragaven',                email: 'stevenragaven1234@gmail.com',      code: 'STEVEN70',  budget: '111.3',  x: 'https://x.com/SSz943759076294/status/2043973151298654353', insta: 'https://www.instagram.com/p/DXG0K3fiK3j/' },
  { date: '2026-04-15', name: 'Fábio Pelucio',                 email: 'peluciof@gmail.com',               code: 'FABIO70',   budget: '111.3',  x: 'https://x.com/PelucioFabio/status/2044166342966739125?s=20', insta: 'https://www.instagram.com/p/DXIT6_BlA4A/' },
  { date: '2026-04-15', name: 'Cicero Sales Lima',             email: 'omatutotrader@gmail.com',          code: 'LIMA70',    budget: '286.3',  x: 'https://x.com/OMatutoTrader/status/2044110950215672158', insta: 'https://www.instagram.com/p/DXHp-7TEVaU/' },
  { date: '2026-04-15', name: 'SAT SEAB',                      email: 'seabsat7@gmail.com',               code: 'SAT70',     budget: '433.3',  x: 'https://x.com/seab67517487/status/2044301138498072960', insta: 'https://www.instagram.com/p/DXFOtxkE6wK/' },
  { date: '2026-04-15', name: 'Duc Dam Minh',                  email: 'damminhduc44616@gmail.com',        code: 'DUC70',     budget: '111.3',  x: 'https://x.com/MinhDuc1799/status/2044326030987669600?s=20', insta: 'https://www.instagram.com/p/DXJJkddk3m2/' },
  { date: '2026-04-16', name: 'Bharath Rayapeta',              email: 'rsbharath@gmail.com',              code: 'RSB70',     budget: '349.3',  x: 'https://x.com/bharath8571/status/2044145677366689971?s=20', insta: 'https://www.instagram.com/p/DXH_5blkcCl/' },
  { date: '2026-04-16', name: 'Khoan Nguyen Dinh',             email: 'KHOANFX211@gmail.com',             code: 'KHOAN70',   budget: '433.3',  x: 'https://x.com/Nguoilamchu/status/2044653463095943174', insta: 'https://www.instagram.com/p/DXLm930kXuf/' },
  { date: '2026-04-16', name: 'Haja Ajeej',                    email: 'hajaajeez@gmail.com',              code: 'HAJA70',    budget: '90.3',   x: 'https://x.com/hajaajeez/status/2044609086109757784?s=46', insta: 'https://www.instagram.com/p/DXLQhGnAi4a/' },
  { date: '2026-04-16', name: 'Jhonatan Martins de Oliveira',  email: 'jhonatanmartins395@gmail.com',     code: 'JHONATAN70', budget: '181.3', x: 'https://x.com/Jhonata98054753/status/2044515686232293767?s=20', insta: 'https://www.instagram.com/p/DXKX1s3kZI3/' },
  { date: '2026-04-17', name: 'Petrus Swart',                  email: 'attieswart@mweb.co.za',            code: 'PETRUS70',  budget: '181.3',  x: 'https://x.com/OomHades/status/2044766567305445384', insta: 'https://www.instagram.com/p/DXMZDvnCKdi/' },
  { date: '2026-04-17', name: 'Tho Phan Viet',                 email: 'phanvietthoo@gmail.com',           code: 'PHAN70',    budget: '160.3',  x: 'https://x.com/phvt96/status/2044978048186130462?s=46', insta: 'https://www.instagram.com/p/DXN6dlVETZ8/' },
  { date: '2026-04-17', name: 'Destiny Ogbebor',               email: 'des2bam@gmail.com',                code: 'DESTINY70', budget: '48.3',   x: 'https://x.com/DxOracle/status/2044760574907527325?s=20', insta: 'https://www.instagram.com/p/DW6QVd3iM9U/' },
  { date: '2026-04-17', name: 'Hemin Khudhur',                 email: 'hemnmuhammad99@gmail.com',         code: '5% payout bonus', budget: '', x: 'https://x.com/propfirmtraader/status/2045244724223611219?s=46', insta: 'https://www.instagram.com/p/DXZIIPuCEoO/' },
  { date: '2026-04-19', name: 'Thuận Phan',                    email: 'thuan.phan.dev@gmail.com',         code: 'THUAN70',   budget: '111.3',  x: 'https://x.com/ethanphan_dev/status/2045532510546006288', insta: 'https://www.instagram.com/p/DXR1_s0GvS4/' },
  { date: '2026-04-21', name: 'DINH PHUOC DUONG',              email: 'ddinhphuoc@gmail.com',             code: 'DINH70',    budget: '',       x: 'https://x.com/i/status/2046411111638135188', insta: 'https://www.instagram.com/p/DXYFwV6jxwZ/' },
  { date: '2026-04-21', name: 'Carlos Muñoz Espada',           email: 'carlosmunozespada@gmail.com',      code: 'CME70',     budget: '',       x: 'https://x.com/carlosmunozespa/status/2045154532011782162?s=20', insta: 'https://www.instagram.com/p/DXNvObODD-I/' },
  { date: '2026-04-21', name: 'Ana Clara Venturini',           email: 'venturini.anac@gmail.com',         code: 'ANA70',     budget: '',       x: 'https://x.com/Lothriena/status/2045183936825798938', insta: 'https://www.instagram.com/p/DXPXSM7kTQr/' },
  { date: '2026-04-22', name: 'Sopheak Ung',                   email: 'upheak@gmail.com',                 code: 'UNG70',     budget: '',       x: 'https://x.com/ungsopheak2/status/2046724873695957045?s=46', insta: 'https://www.instagram.com/p/DXZRs06gWME/' },
  { date: '2026-04-22', name: 'Eberechi Ezekwu',               email: 'andrewebere71@gmail.com',          code: 'RECHI70',   budget: '500',    x: 'https://x.com/AnointingAha/status/2046896566141624768', insta: 'https://www.instagram.com/p/DXbikf9DCL6I-A0VTEP3lk8yPPPnQqXzRqs-zE0/' },
  { date: '2026-04-23', name: 'Julio Cesar Santos',            email: 'jninvestimentos2024@hotmail.com',  code: 'JULIO70',   budget: '',       x: 'https://x.com/JulioPontini/status/2047006685722534055', insta: 'https://www.instagram.com/reel/DXcUECzCCAE/' },
  { date: '2026-04-23', name: 'Erkhembayar Munkhbat',          email: 'erhemee.munkhbat@gmail.com',       code: 'ERKH70',    budget: '',       x: 'https://x.com/ErhemeeMunkhbat/status/2047046764948292082?s=20', insta: 'https://www.instagram.com/p/DXcnFdwkg9u/' },
  { date: '2026-04-24', name: 'Juviell Villanueva',            email: 'villanuevajuviell09@gmail.com',    code: 'JUVIELL70', budget: '',       x: 'https://x.com/i/status/2047390784060612935', insta: 'https://www.instagram.com/p/DXeryRQkegU/' },
  { date: '2026-04-24', name: 'Thiago Marecos',                email: 'marecostato@gmail.com',            code: 'THIAGO70',  budget: '',       x: 'https://x.com/i/status/2047390784060612935', insta: 'https://www.instagram.com/p/DXeryRQkegU/' },
  { date: '2026-04-24', name: 'Andre Herman',                  email: 'andre.trdacc@gmail.com',           code: 'ANDRE70',   budget: '',       x: 'https://x.com/i/status/2047311605327929781', insta: 'https://www.instagram.com/p/DXeLfEPEVML/' },
  { date: '2026-04-24', name: 'Battur Chimidbat',              email: 'cbattur@gmail.com',                code: 'BATTUR70',  budget: '',       x: 'https://x.com/turuuc/status/2047461410985386258?s=46', insta: 'https://www.instagram.com/p/DXe58m3kxgu/' },
  { date: '2026-04-25', name: 'Calvin Williams',               email: 'calvinwilliams013@yahoo.com',      code: 'WILL70',    budget: '500',    x: 'https://x.com/ChrisSmith98106/status/2047642520549490832', insta: 'https://www.instagram.com/p/DXg1za-jmcm/' },
  { date: '2026-04-25', name: 'Vu Tran',                       email: 'vutran03699@gmail.com',            code: 'VUT70',     budget: '500',    x: 'https://x.com/vutrann369/status/2047664239574413345?s=46', insta: 'https://www.instagram.com/p/DXhAHx8kQCl/' },
  { date: '2026-04-25', name: 'Muhammad Razaib Afridi',        email: 'r.afridy@gmail.com',               code: 'AFRIDI70',  budget: '',       x: 'https://x.com/muhammadrayzee/status/2047783582697988176?s=46', insta: 'https://www.instagram.com/p/DXgscpaDmdG/' },
];

function buildEntry(row) {
  return {
    Email: row.email.trim().toLowerCase(),
    SubmittedBy: row.name.trim(),
    AccountId: '',
    X: row.x || '',
    Insta: row.insta || '',
    DiscountCode: row.code || '',
    BonusPct: row.budget || '',
    RajasApproval: 'Approved', RajasBy: APPROVED_BY, RajasTime: APPROVED_TIME,
    OpsApproval: 'Approved',   OpsBy: APPROVED_BY,   OpsTime: APPROVED_TIME,
    NainaApproval: 'Approved', NainaBy: APPROVED_BY, NainaTime: APPROVED_TIME,
    createdAt: new Date(row.date),
    updatedAt: new Date(row.date),
  };
}

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB:', MONGO_URI);

  // 1. Drop all existing entries
  const deleted = await Entry.deleteMany({});
  console.log(`🗑  Deleted ${deleted.deletedCount} existing entries`);

  // 2. Import historical data
  let imported = 0;
  for (const row of historicalData) {
    try {
      await Entry.create(buildEntry(row));
      console.log(`  ✔ ${row.email} — ${row.code}`);
      imported++;
    } catch (e) {
      console.error(`  ✗ ${row.email}: ${e.message}`);
    }
  }

  console.log(`\n🌱 Import complete! ${imported}/${historicalData.length} entries imported.`);
  console.log(`\n⚡ Next step: run "node server.js" then hit Admin → Full Re-sync to push to Google Sheet.`);
  await mongoose.disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
