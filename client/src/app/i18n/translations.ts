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
  bookmark: string;
  bookmarked: string;
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
  viewProfile: string;
  editProfile: string;
  usernameLabel: string;
  saveChanges: string;
  profileUpdated: string;
  changePassword: string;
  currentPassword: string;
  newPassword: string;
  passwordChanged: string;
  showPassword: string;
  hidePassword: string;
  deleteAccount: string;
  deleteAccountWarning: string;
  confirmDelete: string;
  memberSince: string;
  lastActive: string;
  avatarUpdated: string;
  avatarInvalid: string;
  myPosts: string;
  cancel: string;
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
  // Shell / X-layout
  posts: string;
  pulse: string;
  insights: string;
  viewAllPosts: string;
  postsComingSoon: string;
  whatsHappening: string;
  signInToPost: string;
  post: string;
  postFailed: string;
  deletePost: string;
  articleUnavailable: string;
  quoteThis: string;
  attachedArticle: string;
  noPostsYet: string;
  askAI: string;
  chatAbout: string;
  chatWelcome: string;
  chatPlaceholder: string;
  clearChat: string;
  aiUnavailable: string;
  pageNotFound: string;
  errorTitle: string;
  fetchFailed: string;
  tryDifferent: string;
  newsLabel: string;
  googleCompleteSignup: string;
  menu: string;
  // Markets (Business view)
  markets: string;
  delayedData: string;
  businessTrend: string;
  articlesPerDay: string;
  avgTone: string;
  // Footer
  footerTagline: string;
  navigate: string;
  newsSources: string;
  legalInfo: string;
  termsOfService: string;
  privacyPolicy: string;
  poweredByNLP: string;
  allRightsReserved: string;
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
    bookmark: 'Bookmark',
    bookmarked: 'Saved',
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
    viewProfile: 'View profile',
    editProfile: 'Edit profile',
    usernameLabel: 'Username',
    saveChanges: 'Save changes',
    profileUpdated: 'Profile updated',
    changePassword: 'Change password',
    currentPassword: 'Current password',
    newPassword: 'New password',
    passwordChanged: 'Password changed',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    deleteAccount: 'Delete account',
    deleteAccountWarning: 'This permanently deletes your account, bookmarks and posts. This cannot be undone.',
    confirmDelete: 'Yes, delete my account',
    memberSince: 'Joined',
    lastActive: 'Last active',
    avatarUpdated: 'Photo updated',
    avatarInvalid: 'Could not read that image',
    myPosts: 'My Posts',
    cancel: 'Cancel',
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
    posts: 'Posts',
    pulse: 'Pulse',
    insights: 'Insights',
    viewAllPosts: 'View all posts',
    postsComingSoon: 'Posts are coming soon',
    whatsHappening: "What's happening?",
    signInToPost: 'Sign in to post',
    post: 'Post',
    postFailed: 'Could not publish your post',
    deletePost: 'Delete post',
    articleUnavailable: 'Article no longer available',
    quoteThis: 'Quote this',
    attachedArticle: 'Attached article',
    noPostsYet: 'No posts yet — be the first to share something',
    askAI: 'Ask AI',
    chatAbout: 'About:',
    chatWelcome: "Ask me anything about this article and I'll answer based on its content.",
    chatPlaceholder: 'Ask about this article...',
    clearChat: 'Clear chat',
    aiUnavailable: 'Sorry, the AI assistant is unavailable right now.',
    pageNotFound: 'Page not found',
    errorTitle: 'Error',
    fetchFailed: 'Failed to fetch news. Please check your connection.',
    tryDifferent: 'Try a different search or category',
    newsLabel: 'News',
    googleCompleteSignup: 'Almost there — set a password to finish creating your account',
    menu: 'Menu',
    markets: 'Markets',
    delayedData: 'Delayed',
    businessTrend: 'Business pulse — 14 days',
    articlesPerDay: 'Articles/day',
    avgTone: 'Avg tone',
    footerTagline: 'AI-Powered News Intelligence',
    navigate: 'Navigate',
    newsSources: 'Sources',
    legalInfo: 'Legal & Info',
    termsOfService: 'Terms of Service',
    privacyPolicy: 'Privacy Policy',
    poweredByNLP: 'Powered by NLP Sentiment Analysis',
    allRightsReserved: 'All rights reserved.',
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
    bookmark: 'Simpan',
    bookmarked: 'Tersimpan',
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
    viewProfile: 'Lihat profil',
    editProfile: 'Edit profil',
    usernameLabel: 'Nama pengguna',
    saveChanges: 'Simpan perubahan',
    profileUpdated: 'Profil diperbarui',
    changePassword: 'Ganti kata sandi',
    currentPassword: 'Kata sandi saat ini',
    newPassword: 'Kata sandi baru',
    passwordChanged: 'Kata sandi berhasil diganti',
    showPassword: 'Tampilkan kata sandi',
    hidePassword: 'Sembunyikan kata sandi',
    deleteAccount: 'Hapus akun',
    deleteAccountWarning: 'Ini menghapus permanen akun, bookmark, dan postingan Anda. Tidak bisa dibatalkan.',
    confirmDelete: 'Ya, hapus akun saya',
    memberSince: 'Bergabung',
    lastActive: 'Terakhir aktif',
    avatarUpdated: 'Foto diperbarui',
    avatarInvalid: 'Gambar tidak bisa dibaca',
    myPosts: 'Postingan Saya',
    cancel: 'Batal',
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
    posts: 'Postingan',
    pulse: 'Pulse',
    insights: 'Wawasan',
    viewAllPosts: 'Lihat semua postingan',
    postsComingSoon: 'Fitur postingan segera hadir',
    whatsHappening: 'Apa yang sedang terjadi?',
    signInToPost: 'Masuk untuk memposting',
    post: 'Posting',
    postFailed: 'Postingan gagal diterbitkan',
    deletePost: 'Hapus postingan',
    articleUnavailable: 'Artikel sudah tidak tersedia',
    quoteThis: 'Kutip artikel ini',
    attachedArticle: 'Artikel terlampir',
    noPostsYet: 'Belum ada postingan — jadilah yang pertama berbagi',
    askAI: 'Tanya AI',
    chatAbout: 'Tentang:',
    chatWelcome: 'Tanyakan apa saja tentang artikel ini — saya jawab berdasarkan isinya.',
    chatPlaceholder: 'Tanya tentang artikel ini...',
    clearChat: 'Bersihkan obrolan',
    aiUnavailable: 'Maaf, asisten AI sedang tidak tersedia.',
    pageNotFound: 'Halaman tidak ditemukan',
    errorTitle: 'Galat',
    fetchFailed: 'Gagal memuat berita. Periksa koneksi Anda.',
    tryDifferent: 'Coba pencarian atau kategori lain',
    newsLabel: 'Berita',
    googleCompleteSignup: 'Hampir selesai — buat kata sandi untuk menuntaskan pendaftaran',
    menu: 'Menu',
    markets: 'Pasar',
    delayedData: 'Tertunda',
    businessTrend: 'Denyut bisnis — 14 hari',
    articlesPerDay: 'Artikel/hari',
    avgTone: 'Tone rata-rata',
    footerTagline: 'Intelijen Berita Bertenaga AI',
    navigate: 'Navigasi',
    newsSources: 'Sumber',
    legalInfo: 'Hukum & Info',
    termsOfService: 'Ketentuan Layanan',
    privacyPolicy: 'Kebijakan Privasi',
    poweredByNLP: 'Didukung Analisis Sentimen NLP',
    allRightsReserved: 'Hak cipta dilindungi.',
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
    bookmark: '收藏',
    bookmarked: '已收藏',
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
    viewProfile: '查看资料',
    editProfile: '编辑资料',
    usernameLabel: '用户名',
    saveChanges: '保存更改',
    profileUpdated: '资料已更新',
    changePassword: '修改密码',
    currentPassword: '当前密码',
    newPassword: '新密码',
    passwordChanged: '密码已修改',
    showPassword: '显示密码',
    hidePassword: '隐藏密码',
    deleteAccount: '删除账户',
    deleteAccountWarning: '这将永久删除您的账户、书签和帖子，无法撤销。',
    confirmDelete: '是的，删除我的账户',
    memberSince: '加入于',
    lastActive: '最近活跃',
    avatarUpdated: '头像已更新',
    avatarInvalid: '无法读取该图片',
    myPosts: '我的帖子',
    cancel: '取消',
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
    posts: '帖子',
    pulse: '动态',
    insights: '洞察',
    viewAllPosts: '查看全部帖子',
    postsComingSoon: '帖子功能即将上线',
    whatsHappening: '有什么新鲜事？',
    signInToPost: '登录后发帖',
    post: '发布',
    postFailed: '帖子发布失败',
    deletePost: '删除帖子',
    articleUnavailable: '文章已不可用',
    quoteThis: '引用此文章',
    attachedArticle: '附加文章',
    noPostsYet: '还没有帖子 — 成为第一个分享的人吧',
    askAI: 'AI 问答',
    chatAbout: '关于：',
    chatWelcome: '随便问我关于这篇文章的问题，我会根据内容回答。',
    chatPlaceholder: '询问这篇文章...',
    clearChat: '清空对话',
    aiUnavailable: '抱歉，AI 助手暂时不可用。',
    pageNotFound: '页面未找到',
    errorTitle: '错误',
    fetchFailed: '加载新闻失败，请检查网络连接。',
    tryDifferent: '试试其他搜索或分类',
    newsLabel: '新闻',
    googleCompleteSignup: '快完成了——设置密码即可完成注册',
    menu: '菜单',
    markets: '市场',
    delayedData: '延迟',
    businessTrend: '商业脉搏 — 14 天',
    articlesPerDay: '每日文章',
    avgTone: '平均情绪',
    footerTagline: 'AI 驱动的新闻智能',
    navigate: '导航',
    newsSources: '来源',
    legalInfo: '法律与信息',
    termsOfService: '服务条款',
    privacyPolicy: '隐私政策',
    poweredByNLP: '由 NLP 情感分析驱动',
    allRightsReserved: '版权所有。',
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
    bookmark: '收藏',
    bookmarked: '已收藏',
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
    viewProfile: '查看資料',
    editProfile: '編輯資料',
    usernameLabel: '用戶名',
    saveChanges: '儲存變更',
    profileUpdated: '資料已更新',
    changePassword: '修改密碼',
    currentPassword: '目前密碼',
    newPassword: '新密碼',
    passwordChanged: '密碼已修改',
    showPassword: '顯示密碼',
    hidePassword: '隱藏密碼',
    deleteAccount: '刪除帳戶',
    deleteAccountWarning: '這將永久刪除您的帳戶、書籤和貼文，無法復原。',
    confirmDelete: '是的，刪除我的帳戶',
    memberSince: '加入於',
    lastActive: '最近活躍',
    avatarUpdated: '頭像已更新',
    avatarInvalid: '無法讀取該圖片',
    myPosts: '我的貼文',
    cancel: '取消',
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
    posts: '貼文',
    pulse: '動態',
    insights: '洞察',
    viewAllPosts: '查看全部貼文',
    postsComingSoon: '貼文功能即將上線',
    whatsHappening: '有什麼新鮮事？',
    signInToPost: '登入後發文',
    post: '發布',
    postFailed: '貼文發布失敗',
    deletePost: '刪除貼文',
    articleUnavailable: '文章已不可用',
    quoteThis: '引用此文章',
    attachedArticle: '附加文章',
    noPostsYet: '還沒有貼文 — 成為第一個分享的人吧',
    askAI: 'AI 問答',
    chatAbout: '關於：',
    chatWelcome: '隨便問我關於這篇文章的問題，我會根據內容回答。',
    chatPlaceholder: '詢問這篇文章...',
    clearChat: '清空對話',
    aiUnavailable: '抱歉，AI 助手暫時不可用。',
    pageNotFound: '頁面未找到',
    errorTitle: '錯誤',
    fetchFailed: '載入新聞失敗，請檢查網路連線。',
    tryDifferent: '試試其他搜尋或分類',
    newsLabel: '新聞',
    googleCompleteSignup: '快完成了——設定密碼即可完成註冊',
    menu: '選單',
    markets: '市場',
    delayedData: '延遲',
    businessTrend: '商業脈搏 — 14 天',
    articlesPerDay: '每日文章',
    avgTone: '平均情緒',
    footerTagline: 'AI 驅動的新聞智能',
    navigate: '導覽',
    newsSources: '來源',
    legalInfo: '法律與資訊',
    termsOfService: '服務條款',
    privacyPolicy: '隱私政策',
    poweredByNLP: '由 NLP 情感分析驅動',
    allRightsReserved: '版權所有。',
  },
};
