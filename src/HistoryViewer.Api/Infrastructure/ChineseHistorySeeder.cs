using HistoryViewer.Api.Domain.Entities;

namespace HistoryViewer.Api.Infrastructure;

/// <summary>
/// Seeds the database with initial Chinese history data
/// </summary>
public static class ChineseHistorySeeder
{
    public static void Seed(HistoryDbContext context)
    {
        if (context.Eras.Any())
            return; // Already seeded

        // Seed supported languages
        SeedLanguages(context);
        
        // Seed eras (dynasties)
        var eras = SeedEras(context);
        
        // Seed historical figures
        var figures = SeedFigures(context);
        
        // Seed events
        SeedEvents(context, eras, figures);
        
        context.SaveChanges();
    }

    private static void SeedLanguages(HistoryDbContext context)
    {
        var languages = new List<SupportedLanguage>
        {
            new() { Code = "en", NameNative = "English", NameEn = "English", SortOrder = 1, IsActive = true },
            new() { Code = "zh", NameNative = "中文", NameEn = "Chinese (Simplified)", SortOrder = 2, IsActive = true },
            new() { Code = "zh-tw", NameNative = "繁體中文", NameEn = "Chinese (Traditional)", SortOrder = 3, IsActive = true },
        };
        
        context.SupportedLanguages.AddRange(languages);
    }

    private static Dictionary<string, Era> SeedEras(HistoryDbContext context)
    {
        var eras = new List<Era>
        {
            new()
            {
                Id = Guid.NewGuid(),
                Name = "Warring States Period",
                NameI18n = new() { ["zh"] = "战国时代" },
                Description = "Period of warfare among seven major states competing for supremacy",
                DescriptionI18n = new() { ["zh"] = "七个主要诸侯国争霸的战争时期" },
                StartYear = -475,
                EndYear = -221,
                Civilization = "Chinese",
                CapitalLat = 34.27m,
                CapitalLng = 108.93m,
                Color = "#696969"
            },
            new()
            {
                Id = Guid.NewGuid(),
                Name = "Qin Dynasty",
                NameI18n = new() { ["zh"] = "秦朝" },
                Description = "First unified dynasty of China, established by Qin Shi Huang",
                DescriptionI18n = new() { ["zh"] = "中国第一个统一王朝，由秦始皇建立" },
                StartYear = -221,
                EndYear = -206,
                Civilization = "Chinese",
                CapitalLat = 34.27m,
                CapitalLng = 108.93m,
                Color = "#8B4513"
            },
            new()
            {
                Id = Guid.NewGuid(),
                Name = "Han Dynasty",
                NameI18n = new() { ["zh"] = "汉朝" },
                Description = "One of the most prosperous periods in Chinese history, known for territorial expansion and cultural development",
                DescriptionI18n = new() { ["zh"] = "中国历史上最繁荣的时期之一，以领土扩张和文化发展著称" },
                StartYear = -206,
                EndYear = 220,
                Civilization = "Chinese",
                CapitalLat = 34.27m,
                CapitalLng = 108.93m,
                Color = "#DC143C"
            },
            new()
            {
                Id = Guid.NewGuid(),
                Name = "Three Kingdoms",
                NameI18n = new() { ["zh"] = "三国时代" },
                Description = "Period of warfare between Wei, Shu, and Wu kingdoms",
                DescriptionI18n = new() { ["zh"] = "魏、蜀、吴三国争霸时期" },
                StartYear = 220,
                EndYear = 280,
                Civilization = "Chinese",
                CapitalLat = 34.27m,
                CapitalLng = 108.93m,
                Color = "#4682B4"
            },
            new()
            {
                Id = Guid.NewGuid(),
                Name = "Sui Dynasty",
                NameI18n = new() { ["zh"] = "隋朝" },
                Description = "Short but influential dynasty that reunified China",
                DescriptionI18n = new() { ["zh"] = "短暂但有影响力的朝代，重新统一了中国" },
                StartYear = 581,
                EndYear = 618,
                Civilization = "Chinese",
                CapitalLat = 34.27m,
                CapitalLng = 108.93m,
                Color = "#4B0082"
            },
            new()
            {
                Id = Guid.NewGuid(),
                Name = "Tang Dynasty",
                NameI18n = new() { ["zh"] = "唐朝" },
                Description = "Golden age of Chinese civilization, known for poetry, art, and international influence",
                DescriptionI18n = new() { ["zh"] = "中华文明的黄金时代，以诗歌、艺术和国际影响力著称" },
                StartYear = 618,
                EndYear = 907,
                Civilization = "Chinese",
                CapitalLat = 34.27m,
                CapitalLng = 108.93m,
                Color = "#FFD700"
            },
            new()
            {
                Id = Guid.NewGuid(),
                Name = "Song Dynasty",
                NameI18n = new() { ["zh"] = "宋朝" },
                Description = "Era of economic prosperity, technological innovation, and cultural refinement",
                DescriptionI18n = new() { ["zh"] = "经济繁荣、技术创新和文化精致的时代" },
                StartYear = 960,
                EndYear = 1279,
                Civilization = "Chinese",
                CapitalLat = 34.75m,
                CapitalLng = 113.65m,
                Color = "#32CD32"
            },
            new()
            {
                Id = Guid.NewGuid(),
                Name = "Yuan Dynasty",
                NameI18n = new() { ["zh"] = "元朝" },
                Description = "Mongol-led dynasty founded by Kublai Khan",
                DescriptionI18n = new() { ["zh"] = "由忽必烈建立的蒙古人王朝" },
                StartYear = 1271,
                EndYear = 1368,
                Civilization = "Chinese",
                CapitalLat = 39.90m,
                CapitalLng = 116.40m,
                Color = "#1E90FF"
            },
            new()
            {
                Id = Guid.NewGuid(),
                Name = "Ming Dynasty",
                NameI18n = new() { ["zh"] = "明朝" },
                Description = "Native Chinese dynasty known for maritime expeditions and the Forbidden City",
                DescriptionI18n = new() { ["zh"] = "以航海远征和紫禁城闻名的汉族王朝" },
                StartYear = 1368,
                EndYear = 1644,
                Civilization = "Chinese",
                CapitalLat = 39.90m,
                CapitalLng = 116.40m,
                Color = "#FF6347"
            },
            new()
            {
                Id = Guid.NewGuid(),
                Name = "Qing Dynasty",
                NameI18n = new() { ["zh"] = "清朝" },
                Description = "Last imperial dynasty of China, ruled by Manchu people",
                DescriptionI18n = new() { ["zh"] = "中国最后一个帝制王朝，由满族人统治" },
                StartYear = 1644,
                EndYear = 1912,
                Civilization = "Chinese",
                CapitalLat = 39.90m,
                CapitalLng = 116.40m,
                Color = "#9932CC"
            }
        };

        context.Eras.AddRange(eras);
        return eras.ToDictionary(e => e.Name, e => e);
    }

    private static Dictionary<string, HistoricalFigure> SeedFigures(HistoryDbContext context)
    {
        var figures = new List<HistoricalFigure>
        {
            new()
            {
                Id = Guid.NewGuid(),
                Name = "Qin Shi Huang",
                NameI18n = new() { ["zh"] = "秦始皇" },
                Biography = "First Emperor of unified China, founder of Qin Dynasty. Known for standardizing weights, measures, and writing.",
                BiographyI18n = new() { ["zh"] = "中国第一位皇帝，秦朝创建者。以统一度量衡和文字著称。" },
                BirthYear = -259,
                DeathYear = -210,
                BirthPlaceLat = 34.27m,
                BirthPlaceLng = 108.93m
            },
            new()
            {
                Id = Guid.NewGuid(),
                Name = "Liu Bang",
                NameI18n = new() { ["zh"] = "刘邦" },
                Biography = "Founder of Han Dynasty, known as Emperor Gaozu of Han. Rose from peasant origins to become emperor.",
                BiographyI18n = new() { ["zh"] = "汉朝开国皇帝，即汉高祖。从平民出身成为皇帝。" },
                BirthYear = -256,
                DeathYear = -195,
                BirthPlaceLat = 34.37m,
                BirthPlaceLng = 116.85m
            },
            new()
            {
                Id = Guid.NewGuid(),
                Name = "Emperor Wu of Han",
                NameI18n = new() { ["zh"] = "汉武帝" },
                Biography = "One of the greatest emperors in Chinese history, expanded Han territory and established the Silk Road.",
                BiographyI18n = new() { ["zh"] = "中国历史上最伟大的皇帝之一，扩大汉朝疆域并开辟丝绸之路。" },
                BirthYear = -156,
                DeathYear = -87,
                BirthPlaceLat = 34.27m,
                BirthPlaceLng = 108.93m
            },
            new()
            {
                Id = Guid.NewGuid(),
                Name = "Cao Cao",
                NameI18n = new() { ["zh"] = "曹操" },
                Biography = "Brilliant strategist and poet who laid the foundation for Wei Kingdom during Three Kingdoms period.",
                BiographyI18n = new() { ["zh"] = "杰出的军事家和诗人，为魏国奠定了基础。" },
                BirthYear = 155,
                DeathYear = 220,
                BirthPlaceLat = 33.87m,
                BirthPlaceLng = 115.77m
            },
            new()
            {
                Id = Guid.NewGuid(),
                Name = "Emperor Taizong of Tang",
                NameI18n = new() { ["zh"] = "唐太宗" },
                Biography = "Second emperor of Tang Dynasty, initiated the prosperous Zhenguan era. Considered one of the greatest Chinese emperors.",
                BiographyI18n = new() { ["zh"] = "唐朝第二位皇帝，开创贞观之治。被认为是最伟大的中国皇帝之一。" },
                BirthYear = 598,
                DeathYear = 649,
                BirthPlaceLat = 34.27m,
                BirthPlaceLng = 108.93m
            },
            new()
            {
                Id = Guid.NewGuid(),
                Name = "Wu Zetian",
                NameI18n = new() { ["zh"] = "武则天" },
                Biography = "The only woman in Chinese history to assume the title of Empress Regnant.",
                BiographyI18n = new() { ["zh"] = "中国历史上唯一的女皇帝。" },
                BirthYear = 624,
                DeathYear = 705,
                BirthPlaceLat = 34.27m,
                BirthPlaceLng = 108.93m
            },
            new()
            {
                Id = Guid.NewGuid(),
                Name = "Genghis Khan",
                NameI18n = new() { ["zh"] = "成吉思汗" },
                Biography = "Founder of the Mongol Empire, grandfather of Kublai Khan who established Yuan Dynasty.",
                BiographyI18n = new() { ["zh"] = "蒙古帝国创建者，忽必烈的祖父，忽必烈建立了元朝。" },
                BirthYear = 1162,
                DeathYear = 1227,
                BirthPlaceLat = 48.78m,
                BirthPlaceLng = 107.52m
            },
            new()
            {
                Id = Guid.NewGuid(),
                Name = "Kublai Khan",
                NameI18n = new() { ["zh"] = "忽必烈" },
                Biography = "Founder of Yuan Dynasty, grandson of Genghis Khan. First non-Han emperor to conquer all of China.",
                BiographyI18n = new() { ["zh"] = "元朝创建者，成吉思汗之孙。第一位征服全中国的非汉族皇帝。" },
                BirthYear = 1215,
                DeathYear = 1294,
                BirthPlaceLat = 47.92m,
                BirthPlaceLng = 106.92m
            },
            new()
            {
                Id = Guid.NewGuid(),
                Name = "Zheng He",
                NameI18n = new() { ["zh"] = "郑和" },
                Biography = "Ming Dynasty admiral who led seven voyages to Southeast Asia, South Asia, Western Asia, and East Africa.",
                BiographyI18n = new() { ["zh"] = "明朝航海家，率领七次下西洋到东南亚、南亚、西亚和东非。" },
                BirthYear = 1371,
                DeathYear = 1433,
                BirthPlaceLat = 25.05m,
                BirthPlaceLng = 102.72m
            },
            new()
            {
                Id = Guid.NewGuid(),
                Name = "Kangxi Emperor",
                NameI18n = new() { ["zh"] = "康熙帝" },
                Biography = "Fourth emperor of Qing Dynasty, longest-reigning emperor in Chinese history (61 years).",
                BiographyI18n = new() { ["zh"] = "清朝第四位皇帝，中国历史上在位时间最长的皇帝（61年）。" },
                BirthYear = 1654,
                DeathYear = 1722,
                BirthPlaceLat = 39.90m,
                BirthPlaceLng = 116.40m
            }
        };

        context.HistoricalFigures.AddRange(figures);
        return figures.ToDictionary(f => f.Name, f => f);
    }

    private static void SeedEvents(HistoryDbContext context, Dictionary<string, Era> eras, Dictionary<string, HistoricalFigure> figures)
    {
        var events = new List<Event>
        {
            // Qin Dynasty Events
            new()
            {
                Id = Guid.NewGuid(),
                Title = "Unification of China",
                TitleI18n = new() { ["zh"] = "秦统一中国" },
                Description = "Qin Shi Huang unified China, ending the Warring States period and establishing the first imperial dynasty.",
                DescriptionI18n = new() { ["zh"] = "秦始皇统一六国，结束战国时代，建立第一个帝制王朝。" },
                StartYear = -221,
                Latitude = 34.27m,
                Longitude = 108.93m,
                Category = "Political",
                Significance = 10,
                EraId = eras["Qin Dynasty"].Id
            },
            new()
            {
                Id = Guid.NewGuid(),
                Title = "Construction of Great Wall begins",
                TitleI18n = new() { ["zh"] = "长城修建开始" },
                Description = "Beginning of the Great Wall construction to defend against northern invasions.",
                DescriptionI18n = new() { ["zh"] = "开始修建长城以防御北方入侵。" },
                StartYear = -221,
                Latitude = 40.43m,
                Longitude = 116.57m,
                Category = "Construction",
                Significance = 9,
                EraId = eras["Qin Dynasty"].Id
            },
            new()
            {
                Id = Guid.NewGuid(),
                Title = "Burning of Books and Burying of Scholars",
                TitleI18n = new() { ["zh"] = "焚书坑儒" },
                Description = "Qin Shi Huang ordered burning of books and execution of scholars to suppress dissent.",
                DescriptionI18n = new() { ["zh"] = "秦始皇下令焚烧书籍、坑杀儒生以压制异见。" },
                StartYear = -213,
                Latitude = 34.27m,
                Longitude = 108.93m,
                Category = "Cultural",
                Significance = 8,
                EraId = eras["Qin Dynasty"].Id
            },
            new()
            {
                Id = Guid.NewGuid(),
                Title = "Death of Qin Shi Huang",
                TitleI18n = new() { ["zh"] = "秦始皇驾崩" },
                Description = "First Emperor died during his fifth inspection tour, leading to succession crisis.",
                DescriptionI18n = new() { ["zh"] = "始皇帝在第五次巡游途中驾崩，导致继承危机。" },
                StartYear = -210,
                Latitude = 39.63m,
                Longitude = 118.18m,
                Category = "Political",
                Significance = 9,
                EraId = eras["Qin Dynasty"].Id
            },

            // Han Dynasty Events
            new()
            {
                Id = Guid.NewGuid(),
                Title = "Establishment of Han Dynasty",
                TitleI18n = new() { ["zh"] = "汉朝建立" },
                Description = "Liu Bang defeated Xiang Yu and established the Han Dynasty.",
                DescriptionI18n = new() { ["zh"] = "刘邦击败项羽，建立汉朝。" },
                StartYear = -206,
                Latitude = 34.27m,
                Longitude = 108.93m,
                Category = "Political",
                Significance = 10,
                EraId = eras["Han Dynasty"].Id
            },
            new()
            {
                Id = Guid.NewGuid(),
                Title = "Opening of the Silk Road",
                TitleI18n = new() { ["zh"] = "丝绸之路开通" },
                Description = "Zhang Qian's missions to the West opened the Silk Road trade route.",
                DescriptionI18n = new() { ["zh"] = "张骞出使西域开辟了丝绸之路贸易通道。" },
                StartYear = -130,
                Latitude = 34.27m,
                Longitude = 108.93m,
                Category = "Diplomatic",
                Significance = 10,
                EraId = eras["Han Dynasty"].Id
            },
            new()
            {
                Id = Guid.NewGuid(),
                Title = "Invention of Paper",
                TitleI18n = new() { ["zh"] = "造纸术发明" },
                Description = "Cai Lun improved papermaking technology, revolutionizing writing and record-keeping.",
                DescriptionI18n = new() { ["zh"] = "蔡伦改进造纸技术，革新了书写和记录方式。" },
                StartYear = 105,
                Latitude = 34.27m,
                Longitude = 108.93m,
                Category = "Scientific",
                Significance = 10,
                EraId = eras["Han Dynasty"].Id
            },

            // Three Kingdoms Events
            new()
            {
                Id = Guid.NewGuid(),
                Title = "Battle of Red Cliffs",
                TitleI18n = new() { ["zh"] = "赤壁之战" },
                Description = "Allied forces of Liu Bei and Sun Quan defeated Cao Cao's army, shaping the Three Kingdoms period.",
                DescriptionI18n = new() { ["zh"] = "刘备和孙权联军击败曹操军队，奠定了三国格局。" },
                StartYear = 208,
                Latitude = 29.85m,
                Longitude = 113.82m,
                Category = "War",
                Significance = 10,
                EraId = eras["Three Kingdoms"].Id
            },

            // Tang Dynasty Events
            new()
            {
                Id = Guid.NewGuid(),
                Title = "Xuanwu Gate Incident",
                TitleI18n = new() { ["zh"] = "玄武门之变" },
                Description = "Li Shimin (later Emperor Taizong) killed his brothers and became heir apparent.",
                DescriptionI18n = new() { ["zh"] = "李世民（后来的唐太宗）杀死兄弟成为太子。" },
                StartYear = 626,
                Latitude = 34.27m,
                Longitude = 108.93m,
                Category = "Political",
                Significance = 9,
                EraId = eras["Tang Dynasty"].Id
            },
            new()
            {
                Id = Guid.NewGuid(),
                Title = "Xuanzang's Journey to India",
                TitleI18n = new() { ["zh"] = "玄奘西行取经" },
                Description = "Buddhist monk Xuanzang traveled to India to obtain Buddhist scriptures.",
                DescriptionI18n = new() { ["zh"] = "玄奘法师西行印度取经。" },
                StartYear = 629,
                EndYear = 645,
                Latitude = 34.27m,
                Longitude = 108.93m,
                Category = "Religious",
                Significance = 8,
                EraId = eras["Tang Dynasty"].Id
            },
            new()
            {
                Id = Guid.NewGuid(),
                Title = "Wu Zetian becomes Empress",
                TitleI18n = new() { ["zh"] = "武则天称帝" },
                Description = "Wu Zetian became the only woman in Chinese history to assume the title of Empress Regnant.",
                DescriptionI18n = new() { ["zh"] = "武则天成为中国历史上唯一的女皇帝。" },
                StartYear = 690,
                Latitude = 34.27m,
                Longitude = 108.93m,
                Category = "Political",
                Significance = 9,
                EraId = eras["Tang Dynasty"].Id
            },
            new()
            {
                Id = Guid.NewGuid(),
                Title = "An Lushan Rebellion",
                TitleI18n = new() { ["zh"] = "安史之乱" },
                Description = "Devastating rebellion that marked the decline of Tang Dynasty.",
                DescriptionI18n = new() { ["zh"] = "安禄山发动叛乱，标志唐朝由盛转衰。" },
                StartYear = 755,
                EndYear = 763,
                Latitude = 39.90m,
                Longitude = 116.40m,
                Category = "War",
                Significance = 10,
                EraId = eras["Tang Dynasty"].Id
            },

            // Song Dynasty Events
            new()
            {
                Id = Guid.NewGuid(),
                Title = "Invention of Movable Type Printing",
                TitleI18n = new() { ["zh"] = "活字印刷术发明" },
                Description = "Bi Sheng invented movable type printing, revolutionizing book production.",
                DescriptionI18n = new() { ["zh"] = "毕昇发明活字印刷术，革新了书籍生产。" },
                StartYear = 1040,
                Latitude = 34.75m,
                Longitude = 113.65m,
                Category = "Scientific",
                Significance = 10,
                EraId = eras["Song Dynasty"].Id
            },
            new()
            {
                Id = Guid.NewGuid(),
                Title = "Invention of Gunpowder Weapons",
                TitleI18n = new() { ["zh"] = "火药武器发明" },
                Description = "First military applications of gunpowder were developed during Song Dynasty.",
                DescriptionI18n = new() { ["zh"] = "宋朝首次将火药应用于军事。" },
                StartYear = 1000,
                Latitude = 34.75m,
                Longitude = 113.65m,
                Category = "Scientific",
                Significance = 9,
                EraId = eras["Song Dynasty"].Id
            },

            // Yuan Dynasty Events
            new()
            {
                Id = Guid.NewGuid(),
                Title = "Mongol Conquest of China Complete",
                TitleI18n = new() { ["zh"] = "蒙古征服中国完成" },
                Description = "Kublai Khan completed the Mongol conquest of China and established Yuan Dynasty.",
                DescriptionI18n = new() { ["zh"] = "忽必烈完成蒙古对中国的征服，建立元朝。" },
                StartYear = 1279,
                Latitude = 39.90m,
                Longitude = 116.40m,
                Category = "War",
                Significance = 10,
                EraId = eras["Yuan Dynasty"].Id
            },
            new()
            {
                Id = Guid.NewGuid(),
                Title = "Marco Polo arrives in China",
                TitleI18n = new() { ["zh"] = "马可波罗抵达中国" },
                Description = "Venetian merchant Marco Polo arrived at Kublai Khan's court, later writing about his travels.",
                DescriptionI18n = new() { ["zh"] = "威尼斯商人马可波罗抵达忽必烈宫廷，后来记录了他的旅行见闻。" },
                StartYear = 1275,
                Latitude = 39.90m,
                Longitude = 116.40m,
                Category = "Cultural",
                Significance = 8,
                EraId = eras["Yuan Dynasty"].Id
            },

            // Ming Dynasty Events
            new()
            {
                Id = Guid.NewGuid(),
                Title = "Founding of Ming Dynasty",
                TitleI18n = new() { ["zh"] = "明朝建立" },
                Description = "Zhu Yuanzhang overthrew Yuan Dynasty and established Ming Dynasty.",
                DescriptionI18n = new() { ["zh"] = "朱元璋推翻元朝，建立明朝。" },
                StartYear = 1368,
                Latitude = 32.05m,
                Longitude = 118.78m,
                Category = "Political",
                Significance = 10,
                EraId = eras["Ming Dynasty"].Id
            },
            new()
            {
                Id = Guid.NewGuid(),
                Title = "Construction of Forbidden City",
                TitleI18n = new() { ["zh"] = "紫禁城修建" },
                Description = "Construction of the Forbidden City palace complex in Beijing.",
                DescriptionI18n = new() { ["zh"] = "北京紫禁城宫殿建筑群的修建。" },
                StartYear = 1406,
                EndYear = 1420,
                Latitude = 39.92m,
                Longitude = 116.39m,
                Category = "Construction",
                Significance = 9,
                EraId = eras["Ming Dynasty"].Id
            },
            new()
            {
                Id = Guid.NewGuid(),
                Title = "Zheng He's First Voyage",
                TitleI18n = new() { ["zh"] = "郑和首次下西洋" },
                Description = "Admiral Zheng He began his first of seven voyages to Southeast Asia, India, and Africa.",
                DescriptionI18n = new() { ["zh"] = "郑和开始第一次下西洋航行，前往东南亚、印度和非洲。" },
                StartYear = 1405,
                Latitude = 32.05m,
                Longitude = 118.78m,
                Category = "Diplomatic",
                Significance = 9,
                EraId = eras["Ming Dynasty"].Id
            },

            // Qing Dynasty Events
            new()
            {
                Id = Guid.NewGuid(),
                Title = "Manchu Conquest of China",
                TitleI18n = new() { ["zh"] = "清军入关" },
                Description = "Manchu forces entered Beijing and established Qing Dynasty after Ming Dynasty fell.",
                DescriptionI18n = new() { ["zh"] = "满清军队进入北京，明朝灭亡后建立清朝。" },
                StartYear = 1644,
                Latitude = 39.90m,
                Longitude = 116.40m,
                Category = "War",
                Significance = 10,
                EraId = eras["Qing Dynasty"].Id
            },
            new()
            {
                Id = Guid.NewGuid(),
                Title = "First Opium War",
                TitleI18n = new() { ["zh"] = "第一次鸦片战争" },
                Description = "War between Qing Dynasty and British Empire over opium trade.",
                DescriptionI18n = new() { ["zh"] = "清朝与大英帝国之间因鸦片贸易爆发的战争。" },
                StartYear = 1839,
                EndYear = 1842,
                Latitude = 23.13m,
                Longitude = 113.27m,
                Category = "War",
                Significance = 10,
                EraId = eras["Qing Dynasty"].Id
            },
            new()
            {
                Id = Guid.NewGuid(),
                Title = "Taiping Rebellion",
                TitleI18n = new() { ["zh"] = "太平天国运动" },
                Description = "Massive civil war that was one of the deadliest conflicts in history.",
                DescriptionI18n = new() { ["zh"] = "大规模内战，是历史上最惨烈的冲突之一。" },
                StartYear = 1850,
                EndYear = 1864,
                Latitude = 25.27m,
                Longitude = 110.29m,
                Category = "War",
                Significance = 9,
                EraId = eras["Qing Dynasty"].Id
            },
            new()
            {
                Id = Guid.NewGuid(),
                Title = "End of Imperial China",
                TitleI18n = new() { ["zh"] = "帝制终结" },
                Description = "Xinhai Revolution ended over 2000 years of imperial rule in China.",
                DescriptionI18n = new() { ["zh"] = "辛亥革命结束了中国两千多年的帝制统治。" },
                StartYear = 1912,
                Latitude = 30.58m,
                Longitude = 114.27m,
                Category = "Political",
                Significance = 10,
                EraId = eras["Qing Dynasty"].Id
            }
        };

        context.Events.AddRange(events);

        // Add event-figure relationships
        var eventFigures = new List<EventFigure>
        {
            new() { EventId = events.First(e => e.Title == "Unification of China").Id, FigureId = figures["Qin Shi Huang"].Id, Role = "Emperor" },
            new() { EventId = events.First(e => e.Title == "Death of Qin Shi Huang").Id, FigureId = figures["Qin Shi Huang"].Id, Role = "Deceased" },
            new() { EventId = events.First(e => e.Title == "Establishment of Han Dynasty").Id, FigureId = figures["Liu Bang"].Id, Role = "Founder" },
            new() { EventId = events.First(e => e.Title == "Opening of the Silk Road").Id, FigureId = figures["Emperor Wu of Han"].Id, Role = "Sponsor" },
            new() { EventId = events.First(e => e.Title == "Battle of Red Cliffs").Id, FigureId = figures["Cao Cao"].Id, Role = "Commander" },
            new() { EventId = events.First(e => e.Title == "Xuanwu Gate Incident").Id, FigureId = figures["Emperor Taizong of Tang"].Id, Role = "Protagonist" },
            new() { EventId = events.First(e => e.Title == "Wu Zetian becomes Empress").Id, FigureId = figures["Wu Zetian"].Id, Role = "Empress" },
            new() { EventId = events.First(e => e.Title == "Mongol Conquest of China Complete").Id, FigureId = figures["Kublai Khan"].Id, Role = "Conqueror" },
            new() { EventId = events.First(e => e.Title == "Zheng He's First Voyage").Id, FigureId = figures["Zheng He"].Id, Role = "Admiral" },
        };

        context.EventFigures.AddRange(eventFigures);
    }
}
