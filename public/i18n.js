const i18n = {
  current: "en",

  strings: {
    en: {
      title: "Bible Graph",
      search: "Search people, places, events...",
      map: "Map",
      hideMap: "Hide Map",
      biblicalPlaces: "Biblical Places",
      closeMap: "Close Map",
      people: "People",
      places: "Places",
      events: "Events",
      books: "Books",
      showVerses: "Show verses",
      showMore: "Show more",
      showLess: "Show less",
      referencedVerses: "Referenced verses",
      connectedNodes: "Connected nodes",
      noConnected: "No connected nodes.",
      noVerse: "No verse sample in this static slice.",
      noData: "No precomputed data.",
      noSlice: "No precomputed slice yet.",
      refs: "refs",
      references: "references",
      type: "Type",
      group: "Group",
      selected: "Selected",
    },
    zh: {
      title: "圣经图谱",
      search: "搜索人物、地点、事件...",
      map: "地图",
      hideMap: "隐藏地图",
      biblicalPlaces: "圣经地点",
      closeMap: "关闭地图",
      people: "人物",
      places: "地点",
      events: "事件",
      books: "书卷",
      showVerses: "显示经文",
      showMore: "展开",
      showLess: "收起",
      referencedVerses: "相关经文",
      connectedNodes: "关联节点",
      noConnected: "无关联节点",
      noVerse: "此静态片段无经文样本",
      noData: "无预计算数据",
      noSlice: "尚无预计算片段",
      refs: "引用",
      references: "引用",
      type: "类型",
      group: "分组",
      selected: "已选中",
    },
  },

  // Well-known biblical name translations
  names: {
    // People
    "Moses": "摩西", "David": "大卫", "Abraham": "亚伯拉罕", "Isaac": "以撒",
    "Jacob": "雅各", "Joseph": "约瑟", "Aaron": "亚伦", "Joshua": "约书亚",
    "Samuel": "撒母耳", "Solomon": "所罗门", "Elijah": "以利亚", "Elisha": "以利沙",
    "Isaiah": "以赛亚", "Jeremiah": "耶利米", "Daniel": "但以理", "Ezekiel": "以西结",
    "Noah": "挪亚", "Adam": "亚当", "Eve": "夏娃", "Cain": "该隐", "Abel": "亚伯",
    "Sarah": "撒拉", "Rebekah": "利百加", "Rachel": "拉结", "Leah": "利亚",
    "Ruth": "路得", "Esther": "以斯帖", "Hannah": "哈拿", "Miriam": "米利暗",
    "Peter": "彼得", "Paul": "保罗", "John": "约翰", "James": "雅各",
    "Matthew": "马太", "Mark": "马可", "Luke": "路加", "Andrew": "安得烈",
    "Thomas": "多马", "Philip": "腓力", "Barnabas": "巴拿巴", "Timothy": "提摩太",
    "Jesus": "耶稣", "Mary": "马利亚", "Martha": "马大", "Lazarus": "拉撒路",
    "Judas": "犹大", "Pilate": "彼拉多", "Herod": "希律",
    "Saul": "扫罗", "Jonathan": "约拿单", "Absalom": "押沙龙",
    "Samson": "参孙", "Gideon": "基甸", "Deborah": "底波拉",
    "Nehemiah": "尼希米", "Ezra": "以斯拉", "Job": "约伯",
    "Lot": "罗得", "Hagar": "夏甲", "Ishmael": "以实玛利",
    "Benjamin": "便雅悯", "Reuben": "流便", "Simeon": "西缅",
    "Levi": "利未", "Judah": "犹大", "Dan": "但", "Gad": "迦得",
    "Asher": "亚设", "Naphtali": "拿弗他利", "Zebulun": "西布伦",
    "Issachar": "以萨迦", "Manasseh": "玛拿西", "Ephraim": "以法莲",
    "Caleb": "迦勒", "Boaz": "波阿斯", "Jesse": "耶西",
    "Eli": "以利", "Nathan": "拿单", "Joab": "约押",
    "Bathsheba": "拔示巴", "Abigail": "亚比该",
    "Rehoboam": "罗波安", "Jeroboam": "耶罗波安",
    "Ahab": "亚哈", "Jezebel": "耶洗别",
    "Hezekiah": "希西家", "Josiah": "约西亚",
    "Mordecai": "末底改", "Stephen": "司提反",
    "Titus": "提多", "Silas": "西拉",
    "Laban": "拉班",

    // Places
    "Jerusalem": "耶路撒冷", "Egypt": "埃及", "Babylon": "巴比伦",
    "Israel": "以色列", "Judah": "犹大", "Canaan": "迦南",
    "Bethlehem": "伯利恒", "Nazareth": "拿撒勒", "Galilee": "加利利",
    "Jordan": "约旦", "Samaria": "撒玛利亚", "Sinai": "西奈",
    "Mount Sinai": "西奈山", "Red Sea": "红海", "Dead Sea": "死海",
    "Sea of Galilee": "加利利海", "Jericho": "耶利哥",
    "Bethany": "伯大尼", "Capernaum": "迦百农", "Nineveh": "尼尼微",
    "Damascus": "大马士革", "Antioch": "安提阿", "Corinth": "哥林多",
    "Ephesus": "以弗所", "Rome": "罗马", "Athens": "雅典",
    "Hebron": "希伯仑", "Shiloh": "示罗", "Gilgal": "吉甲",
    "Moab": "摩押", "Edom": "以东", "Philistia": "非利士",
    "Tyre": "推罗", "Sidon": "西顿", "Sodom": "所多玛",
    "Gomorrah": "蛾摩拉", "Ur": "吾珥", "Haran": "哈兰",

    // Books
    "Genesis": "创世记", "Exodus": "出埃及记", "Leviticus": "利未记",
    "Numbers": "民数记", "Deuteronomy": "申命记",
    "Judges": "士师记", "1 Samuel": "撒母耳记上", "2 Samuel": "撒母耳记下",
    "1 Kings": "列王纪上", "2 Kings": "列王纪下",
    "1 Chronicles": "历代志上", "2 Chronicles": "历代志下",
    "Nehemiah": "尼希米记", "Psalms": "诗篇", "Proverbs": "箴言",
    "Ecclesiastes": "传道书", "Song of Solomon": "雅歌",
    "Lamentations": "耶利米哀歌", "Hosea": "何西阿书",
    "Joel": "约珥书", "Amos": "阿摩司书", "Obadiah": "俄巴底亚书",
    "Jonah": "约拿书", "Micah": "弥迦书", "Nahum": "那鸿书",
    "Habakkuk": "哈巴谷书", "Zephaniah": "西番雅书",
    "Haggai": "哈该书", "Zechariah": "撒迦利亚书", "Malachi": "玛拉基书",
    "Acts": "使徒行传", "Romans": "罗马书",
    "1 Corinthians": "哥林多前书", "2 Corinthians": "哥林多后书",
    "Galatians": "加拉太书", "Ephesians": "以弗所书",
    "Philippians": "腓立比书", "Colossians": "歌罗西书",
    "1 Thessalonians": "帖撒罗尼迦前书", "2 Thessalonians": "帖撒罗尼迦后书",
    "1 Timothy": "提摩太前书", "2 Timothy": "提摩太后书",
    "Philemon": "腓利门书", "Hebrews": "希伯来书",
    "1 Peter": "彼得前书", "2 Peter": "彼得后书",
    "1 John": "约翰一书", "2 John": "约翰二书", "3 John": "约翰三书",
    "Jude": "犹大书", "Revelation": "启示录",

    // Relationship labels
    "father": "父亲", "mother": "母亲", "children": "子女",
    "siblings": "兄弟姐妹", "partners": "配偶",
    "place": "地点", "participated": "参与",
    "participant": "参与者", "location": "地点",
    "writer": "作者", "mentions": "提及",
    "part of": "属于", "contains": "包含",
    "event": "事件", "occurred in": "发生于",
    "predecessor": "前事件",

    // Types
    "Person": "人物", "Place": "地点", "Event": "事件",
    "Book": "书卷", "Chapter": "章节",
    "Male": "男", "Female": "女",
    "Focus": "焦点", "Mentioned": "被提及",
    "Writer": "作者",
  },

  t(key) {
    return this.strings[this.current]?.[key] || this.strings.en[key] || key;
  },

  name(englishName) {
    if (this.current === "en") return englishName;
    // Try exact match first
    if (this.names[englishName]) return this.names[englishName];
    // Try matching the first word (for names like "Mount Sinai")
    for (const [en, zh] of Object.entries(this.names)) {
      if (englishName === en) return zh;
    }
    return englishName;
  },

  toggle() {
    this.current = this.current === "en" ? "zh" : "en";
  },
};
