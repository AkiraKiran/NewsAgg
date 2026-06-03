export type Language = 'en' | 'id' | 'zhCN' | 'zhTW';

export interface Translations {
  home: string;
  topHeadlines: string;
  country: string;
  category: string;
  search: string;
  searchPlaceholder: string;
  allCategories: string;
  technology: string;
  business: string;
  science: string;
  health: string;
  entertainment: string;
  sports: string;
  general: string;
  english: string;
  bahasa: string;
  zhSimplified: string;
  zhTraditional: string;
  sentiment: string;
  positive: string;
  neutral: string;
  negative: string;
  trending: string;
  trendingTopics: string;
  audienceEngagement: string;
  sentimentDistribution: string;
  source: string;
  author: string;
  publishedAt: string;
  readMore: string;
  loading: string;
  loadMore: string;
  previous: string;
  next: string;
  page: string;
  of: string;
  account: string;
  bookmarks: string;
  settings: string;
  language: string;
  signIn: string;
  signOut: string;
  appearance: string;
  changePhoto: string;
  removePhoto: string;
  darkMode: string;
  lightMode: string;
  profile: string;
  createAccount: string;
  addAccount: string;
  loggedInAs: string;
  scrollToTop: string;
  articleSentiment: string;
  emotionBreakdown: string;
  topicKeywords: string;
  comments: string;
  writeComment: string;
  reply: string;
  joy: string;
  sadness: string;
  anger: string;
  fear: string;
  surprise: string;
  backToHome: string;
  filterByCountry: string;
  selectLanguage: string;
  noResults: string;
  translating: string;
  autoTranslated: string;
  translateAll: string;
  noTranslation: string;
  quoteOfDay: string;
  filter: string;
  filters: string;
  byCategory: string;
  bySource: string;
  bySentiment: string;
  allSources: string;
  allSentiment: string;
  clearFilters: string;
  sources: string;
  topHeadlinesSubtitle: string;
  metricsGlossaryTitle: string;
  aiConfidenceTerm: string;
  aiConfidenceDesc: string;
  toxicityTerm: string;
  toxicityDesc: string;
  readingGradeTerm: string;
  readingGradeDesc: string;
  fleschTerm: string;
  fleschDesc: string;
  smogTerm: string;
  smogDesc: string;
  sentimentMathTitle: string;
  sentimentMathDesc: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    home: 'Home',
    topHeadlines: 'Top Headlines',
    country: 'Country',
    category: 'Category',
    search: 'Search',
    searchPlaceholder: 'Search news, topics, sources...',
    allCategories: 'All Categories',
    technology: 'Technology',
    business: 'Business',
    science: 'Science',
    health: 'Health',
    entertainment: 'Entertainment',
    sports: 'Sports',
    general: 'General',
    english: 'English',
    bahasa: 'Bahasa Indonesia',
    zhSimplified: '简体中文',
    zhTraditional: '繁體中文',
    sentiment: 'Sentiment',
    positive: 'Positive',
    neutral: 'Neutral',
    negative: 'Negative',
    trending: 'Trending',
    trendingTopics: 'Trending Topics',
    audienceEngagement: 'Audience Engagement',
    sentimentDistribution: 'Sentiment Distribution',
    source: 'Source',
    author: 'Author',
    publishedAt: 'Published At',
    readMore: 'Read More',
    loading: 'Loading...',
    loadMore: 'Load More',
    previous: 'Previous',
    next: 'Next',
    page: 'Page',
    of: 'of',
    account: 'Account',
    bookmarks: 'Bookmarks',
    settings: 'Settings',
    language: 'Language',
    signIn: 'Sign In',
    signOut: 'Sign Out',
    appearance: 'Appearance',
    changePhoto: 'Change photo',
    removePhoto: 'Remove photo',
    darkMode: 'Dark Mode',
    lightMode: 'Light Mode',
    profile: 'Profile',
    createAccount: 'Create New Account',
    addAccount: 'Add Existing Account',
    loggedInAs: 'Logged in as',
    scrollToTop: 'Scroll to top',
    articleSentiment: 'Article Sentiment',
    emotionBreakdown: 'Emotion Breakdown',
    topicKeywords: 'Topic Keywords',
    comments: 'Comments',
    writeComment: 'Write a comment...',
    reply: 'Reply',
    joy: 'Joy',
    sadness: 'Sadness',
    anger: 'Anger',
    fear: 'Fear',
    surprise: 'Surprise',
    backToHome: 'Back to Home',
    filterByCountry: 'Filter by Country',
    selectLanguage: 'Language',
    noResults: 'No results found',
    translating: 'Translating…',
    autoTranslated: 'Auto-translated',
    translateAll: 'Translate',
    noTranslation: 'Translation unavailable',
    quoteOfDay: 'Quote of the Day',
    filter: 'Filter',
    filters: 'Filters',
    byCategory: 'By Category',
    bySource: 'By Source',
    bySentiment: 'By Sentiment',
    allSources: 'All Sources',
    allSentiment: 'All Sentiment',
    clearFilters: 'Clear',
    sources: 'Sources',
    topHeadlinesSubtitle: 'The most talked-about stories right now',
    metricsGlossaryTitle: 'Understanding these metrics',
    aiConfidenceTerm: 'AI confidence',
    aiConfidenceDesc: 'How sure the classification model is that this article belongs to its detected topic, from 0 to 100%. Higher means a clearer topic match.',
    toxicityTerm: 'Toxicity score',
    toxicityDesc: 'Likelihood that the text contains rude, disrespectful, or harmful language, scored 0 to 100% by a moderation model. Most news sits very low.',
    readingGradeTerm: 'Reading grade (Flesch–Kincaid)',
    readingGradeDesc: 'The US school grade level needed to read the text easily. 8 means a typical 8th-grader can follow it; higher numbers are harder.',
    fleschTerm: 'Flesch reading ease',
    fleschDesc: 'A 0–100 readability score — higher is easier. 60–70 is plain English; below 30 is dense and academic.',
    smogTerm: 'SMOG index',
    smogDesc: 'Estimates the years of education needed to understand the text, based on sentence length and complex words. Lower is more accessible.',
    sentimentMathTitle: 'How sentiment is decided',
    sentimentMathDesc: 'A RoBERTa model scores each article for positive, neutral, and negative probability. Polarity is the positive minus negative score, and the gradient bar plots it. The label is chosen by these rules:',
  },
  id: {
    home: 'Beranda',
    topHeadlines: 'Berita Utama',
    country: 'Negara',
    category: 'Kategori',
    search: 'Cari',
    searchPlaceholder: 'Cari berita, topik, sumber...',
    allCategories: 'Semua Kategori',
    technology: 'Teknologi',
    business: 'Bisnis',
    science: 'Sains',
    health: 'Kesehatan',
    entertainment: 'Hiburan',
    sports: 'Olahraga',
    general: 'Umum',
    english: 'English',
    bahasa: 'Bahasa Indonesia',
    zhSimplified: '简体中文',
    zhTraditional: '繁體中文',
    sentiment: 'Sentimen',
    positive: 'Positif',
    neutral: 'Netral',
    negative: 'Negatif',
    trending: 'Tren',
    trendingTopics: 'Topik Tren',
    audienceEngagement: 'Keterlibatan Audiens',
    sentimentDistribution: 'Distribusi Sentimen',
    source: 'Sumber',
    author: 'Penulis',
    publishedAt: 'Diterbitkan',
    readMore: 'Baca Selengkapnya',
    loading: 'Memuat...',
    loadMore: 'Muat Lebih Banyak',
    previous: 'Sebelumnya',
    next: 'Berikutnya',
    page: 'Halaman',
    of: 'dari',
    account: 'Akun',
    bookmarks: 'Bookmark',
    settings: 'Pengaturan',
    language: 'Bahasa',
    signIn: 'Masuk',
    signOut: 'Keluar',
    appearance: 'Tampilan',
    changePhoto: 'Ubah foto',
    removePhoto: 'Hapus foto',
    darkMode: 'Mode Gelap',
    lightMode: 'Mode Terang',
    profile: 'Profil',
    createAccount: 'Buat Akun Baru',
    addAccount: 'Tambah Akun',
    loggedInAs: 'Masuk sebagai',
    scrollToTop: 'Ke atas',
    articleSentiment: 'Sentimen Artikel',
    emotionBreakdown: 'Rincian Emosi',
    topicKeywords: 'Kata Kunci',
    comments: 'Komentar',
    writeComment: 'Tulis komentar...',
    reply: 'Balas',
    joy: 'Sukacita',
    sadness: 'Kesedihan',
    anger: 'Kemarahan',
    fear: 'Ketakutan',
    surprise: 'Kejutan',
    backToHome: 'Kembali ke Beranda',
    filterByCountry: 'Filter Berdasarkan Negara',
    selectLanguage: 'Bahasa',
    noResults: 'Tidak ada hasil',
    translating: 'Menerjemahkan…',
    autoTranslated: 'Terjemahan otomatis',
    translateAll: 'Terjemahkan',
    noTranslation: 'Terjemahan tidak tersedia',
    quoteOfDay: 'Kutipan Hari Ini',
    filter: 'Filter',
    filters: 'Filter',
    byCategory: 'Per Kategori',
    bySource: 'Per Sumber',
    bySentiment: 'Per Sentimen',
    allSources: 'Semua Sumber',
    allSentiment: 'Semua Sentimen',
    clearFilters: 'Hapus',
    sources: 'Sumber',
    topHeadlinesSubtitle: 'Berita yang paling banyak dibicarakan saat ini',
    metricsGlossaryTitle: 'Memahami metrik ini',
    aiConfidenceTerm: 'Keyakinan AI',
    aiConfidenceDesc: 'Seberapa yakin model klasifikasi bahwa artikel ini termasuk topik yang terdeteksi, dari 0 hingga 100%. Semakin tinggi, semakin jelas kecocokan topiknya.',
    toxicityTerm: 'Skor toksisitas',
    toxicityDesc: 'Kemungkinan teks mengandung bahasa kasar, tidak sopan, atau berbahaya, dinilai 0 hingga 100% oleh model moderasi. Sebagian besar berita sangat rendah.',
    readingGradeTerm: 'Tingkat baca (Flesch–Kincaid)',
    readingGradeDesc: 'Tingkat kelas sekolah yang dibutuhkan untuk membaca teks dengan mudah. 8 berarti siswa kelas 8 dapat memahaminya; angka lebih tinggi lebih sulit.',
    fleschTerm: 'Kemudahan baca Flesch',
    fleschDesc: 'Skor keterbacaan 0–100 — semakin tinggi semakin mudah. 60–70 adalah bahasa sederhana; di bawah 30 padat dan akademis.',
    smogTerm: 'Indeks SMOG',
    smogDesc: 'Memperkirakan tahun pendidikan yang dibutuhkan untuk memahami teks, berdasarkan panjang kalimat dan kata kompleks. Lebih rendah lebih mudah diakses.',
    sentimentMathTitle: 'Bagaimana sentimen ditentukan',
    sentimentMathDesc: 'Model RoBERTa menilai setiap artikel untuk probabilitas positif, netral, dan negatif. Polaritas adalah skor positif dikurangi negatif, dan bilah gradien menampilkannya. Label dipilih dengan aturan ini:',
  },
  zhCN: {
    home: '首页',
    topHeadlines: '头条新闻',
    country: '国家',
    category: '分类',
    search: '搜索',
    searchPlaceholder: '搜索新闻、话题、来源...',
    allCategories: '所有分类',
    technology: '科技',
    business: '商业',
    science: '科学',
    health: '健康',
    entertainment: '娱乐',
    sports: '体育',
    general: '综合',
    english: 'English',
    bahasa: 'Bahasa Indonesia',
    zhSimplified: '简体中文',
    zhTraditional: '繁體中文',
    sentiment: '情感',
    positive: '积极',
    neutral: '中立',
    negative: '消极',
    trending: '热门',
    trendingTopics: '热门话题',
    audienceEngagement: '受众参与度',
    sentimentDistribution: '情感分布',
    source: '来源',
    author: '作者',
    publishedAt: '发布时间',
    readMore: '阅读更多',
    loading: '加载中...',
    loadMore: '加载更多',
    previous: '上一页',
    next: '下一页',
    page: '第',
    of: '页，共',
    account: '账户',
    bookmarks: '书签',
    settings: '设置',
    language: '语言',
    signIn: '登录',
    signOut: '退出登录',
    appearance: '外观',
    changePhoto: '更换头像',
    removePhoto: '移除头像',
    darkMode: '深色模式',
    lightMode: '浅色模式',
    profile: '个人资料',
    createAccount: '创建新账户',
    addAccount: '添加现有账户',
    loggedInAs: '登录身份',
    scrollToTop: '返回顶部',
    articleSentiment: '文章情感',
    emotionBreakdown: '情绪分析',
    topicKeywords: '关键词',
    comments: '评论',
    writeComment: '写评论...',
    reply: '回复',
    joy: '喜悦',
    sadness: '悲伤',
    anger: '愤怒',
    fear: '恐惧',
    surprise: '惊讶',
    backToHome: '返回首页',
    filterByCountry: '按国家筛选',
    selectLanguage: '语言',
    noResults: '未找到结果',
    translating: '翻译中…',
    autoTranslated: '自动翻译',
    translateAll: '翻译',
    noTranslation: '暂无翻译',
    quoteOfDay: '每日一句',
    filter: '筛选',
    filters: '筛选',
    byCategory: '按分类',
    bySource: '按来源',
    bySentiment: '按情感',
    allSources: '所有来源',
    allSentiment: '所有情感',
    clearFilters: '清除',
    sources: '来源',
    topHeadlinesSubtitle: '当前最受关注的新闻',
    metricsGlossaryTitle: '了解这些指标',
    aiConfidenceTerm: 'AI 置信度',
    aiConfidenceDesc: '分类模型判定该文章属于所检测主题的把握程度，范围 0 到 100%。数值越高，主题匹配越明确。',
    toxicityTerm: '毒性评分',
    toxicityDesc: '文本包含粗鲁、不敬或有害语言的可能性，由审核模型评为 0 到 100%。大多数新闻都非常低。',
    readingGradeTerm: '阅读年级（Flesch–Kincaid）',
    readingGradeDesc: '轻松阅读该文本所需的美国年级水平。8 表示八年级学生即可理解；数字越高越难。',
    fleschTerm: 'Flesch 易读度',
    fleschDesc: '0–100 的易读性评分——越高越易读。60–70 为通俗英语；低于 30 则艰涩且学术。',
    smogTerm: 'SMOG 指数',
    smogDesc: '根据句子长度和复杂词汇，估算理解文本所需的受教育年数。越低越易懂。',
    sentimentMathTitle: '情感如何判定',
    sentimentMathDesc: 'RoBERTa 模型为每篇文章评出积极、中立和消极的概率。极性为积极减去消极的分数，渐变条即按此绘制。标签依据以下规则确定：',
  },
  zhTW: {
    home: '首頁',
    topHeadlines: '頭條新聞',
    country: '國家',
    category: '分類',
    search: '搜尋',
    searchPlaceholder: '搜尋新聞、話題、來源...',
    allCategories: '所有分類',
    technology: '科技',
    business: '商業',
    science: '科學',
    health: '健康',
    entertainment: '娛樂',
    sports: '體育',
    general: '綜合',
    english: 'English',
    bahasa: 'Bahasa Indonesia',
    zhSimplified: '简体中文',
    zhTraditional: '繁體中文',
    sentiment: '情感',
    positive: '積極',
    neutral: '中立',
    negative: '消極',
    trending: '熱門',
    trendingTopics: '熱門話題',
    audienceEngagement: '受眾參與度',
    sentimentDistribution: '情感分佈',
    source: '來源',
    author: '作者',
    publishedAt: '發布時間',
    readMore: '閱讀更多',
    loading: '載入中...',
    loadMore: '載入更多',
    previous: '上一頁',
    next: '下一頁',
    page: '第',
    of: '頁，共',
    account: '帳戶',
    bookmarks: '書籤',
    settings: '設定',
    language: '語言',
    signIn: '登入',
    signOut: '登出',
    appearance: '外觀',
    changePhoto: '更換頭像',
    removePhoto: '移除頭像',
    darkMode: '深色模式',
    lightMode: '淺色模式',
    profile: '個人資料',
    createAccount: '建立新帳戶',
    addAccount: '新增現有帳戶',
    loggedInAs: '登入身份',
    scrollToTop: '返回頂部',
    articleSentiment: '文章情感',
    emotionBreakdown: '情緒分析',
    topicKeywords: '關鍵詞',
    comments: '評論',
    writeComment: '寫評論...',
    reply: '回覆',
    joy: '喜悅',
    sadness: '悲傷',
    anger: '憤怒',
    fear: '恐懼',
    surprise: '驚訝',
    backToHome: '返回首頁',
    filterByCountry: '按國家篩選',
    selectLanguage: '語言',
    noResults: '未找到結果',
    translating: '翻譯中…',
    autoTranslated: '自動翻譯',
    translateAll: '翻譯',
    noTranslation: '暫無翻譯',
    quoteOfDay: '每日一句',
    filter: '篩選',
    filters: '篩選',
    byCategory: '按分類',
    bySource: '按來源',
    bySentiment: '按情感',
    allSources: '所有來源',
    allSentiment: '所有情感',
    clearFilters: '清除',
    sources: '來源',
    topHeadlinesSubtitle: '目前最受關注的新聞',
    metricsGlossaryTitle: '了解這些指標',
    aiConfidenceTerm: 'AI 信心度',
    aiConfidenceDesc: '分類模型判定該文章屬於所偵測主題的把握程度，範圍 0 到 100%。數值越高，主題匹配越明確。',
    toxicityTerm: '毒性評分',
    toxicityDesc: '文字包含粗魯、不敬或有害語言的可能性，由審核模型評為 0 到 100%。大多數新聞都非常低。',
    readingGradeTerm: '閱讀年級（Flesch–Kincaid）',
    readingGradeDesc: '輕鬆閱讀該文字所需的美國年級水準。8 表示八年級學生即可理解；數字越高越難。',
    fleschTerm: 'Flesch 易讀度',
    fleschDesc: '0–100 的易讀性評分——越高越易讀。60–70 為通俗英語；低於 30 則艱澀且學術。',
    smogTerm: 'SMOG 指數',
    smogDesc: '根據句子長度和複雜詞彙，估算理解文字所需的受教育年數。越低越易懂。',
    sentimentMathTitle: '情感如何判定',
    sentimentMathDesc: 'RoBERTa 模型為每篇文章評出積極、中立和消極的機率。極性為積極減去消極的分數，漸層條即按此繪製。標籤依據以下規則確定：',
  },
};
