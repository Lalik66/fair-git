import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Translation resources
const resources = {
  en: {
    translation: {
      // Common
      common: {
        loading: 'Loading...',
        close: 'Close',
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete',
        edit: 'Edit',
        create: 'Create',
        search: 'Search',
        filter: 'Filter',
        clearFilters: 'Clear Filters',
        noResults: 'No results found',
        confirm: 'Confirm',
        yes: 'Yes',
        no: 'No',
        continue: 'Continue',
      },

      // Navigation
      nav: {
        home: 'Home',
        browseMap: 'Browse Map',
        aboutUs: 'About Us',
        signIn: 'Sign In',
        signOut: 'Sign Out',
        dashboard: 'Dashboard',
        profile: 'Profile',
      },

      // Welcome/Home Page
      welcome: {
        title: 'Welcome to Fair Marketplace',
        subtitle: 'Discover amazing fairs and vendors',
        countdown: {
          days: 'Days',
          hours: 'Hours',
          minutes: 'Minutes',
          seconds: 'Seconds',
          fairIsLive: 'Fair is Live!',
          upcomingFair: 'Upcoming Fair',
          viewOnMap: 'View on Map',
        },
        cta: {
          browseMap: 'Browse Map',
          applyVendor: 'Apply as Vendor',
        },
      },

      // Authentication
      auth: {
        login: 'Sign In',
        logout: 'Sign Out',
        password: 'Password',
        googleLogin: 'Sign in with Google',
        orContinueWith: 'or continue with',
        selectRole: 'Select Your Role',
        roleVisitor: 'Visitor',
        roleVendor: 'Vendor',
        roleDescription: {
          visitor: 'Browse fairs and explore vendors',
          vendor: 'Apply for vendor spaces and manage your business',
        },
        // OAuth-related messages
        oauthError: 'Authentication Error',
        oauthFailed: 'Google authentication failed. Please try again.',
        accountDeactivated: 'Your account has been deactivated.',
        noToken: 'No authentication token received.',
        authenticating: 'Completing authentication...',
        pleaseWait: 'Please wait while we log you in.',
        redirecting: 'Redirecting to login...',
        // Role selection (Feature 3 & 221)
        welcomeNewUser: 'Welcome to Fair Marketplace!',
        selectRoleRequired: 'Please select a role to continue',
        roleNote: 'You can upgrade to vendor later from your profile settings.',
      },

      // Map
      map: {
        title: 'Browse Map',
        vendorHouses: 'Vendor Houses',
        facilities: 'Facilities',
        available: 'Available',
        occupied: 'Occupied',
        view360: 'View 360° Tour',
        filterByCategory: 'Filter by Category',
        allCategories: 'All Categories',
        filteredResults: 'Showing {{count}} houses',
        searchLocation: 'Search address or place...',
        search: 'Search...',
        selectFairLabel: 'Select a fair',
        allFairs: 'All fairs',
      },

      // Categories
      categories: {
        food_beverages: 'Food & Beverages',
        handicrafts: 'Handicrafts',
        clothing: 'Clothing',
        accessories: 'Accessories',
        other: 'Other',
      },

      // Facilities
      facilities: {
        restaurant: 'Restaurant',
        cafe: 'Cafe',
        kids_zone: 'Kids Zone',
        restroom: 'Restroom',
        taxi: 'Taxi',
        bus_stop: 'Bus Stop',
        parking: 'Parking',
      },

      // Applications
      applications: {
        title: 'Applications',
        new: 'New Application',
        status: {
          pending: 'Pending',
          approved: 'Approved',
          rejected: 'Rejected',
        },
        form: {
          companyName: 'Company Name',
          contactName: 'Contact Name',
          email: 'Email',
          phone: 'Phone Number',
          category: 'Product Category',
          description: 'Business Description',
          logo: 'Company Logo',
          productImages: 'Product Images',
          preferredHouse: 'Preferred House',
          submit: 'Submit Application',
        },
      },

      // Bookings
      bookings: {
        title: 'My Bookings',
        houseNumber: 'House #',
        fairName: 'Fair',
        dates: 'Dates',
        status: 'Status',
      },

      // Admin
      admin: {
        dashboard: 'Admin Dashboard',
        fairManagement: 'Fair Management',
        applicationReview: 'Application Review',
        mapManagement: 'Map Management',
        userManagement: 'User Management',
        aboutUsEditor: 'About Us Editor',
        adminLogs: 'Admin Logs',
        export: {
          csv: 'Export CSV',
          pdf: 'Export PDF',
        },
      },

      // Vendor
      vendor: {
        dashboard: 'Vendor Dashboard',
        myApplications: 'My Applications',
        myBookings: 'My Bookings',
        profile: 'Profile',
        applyForHouse: 'Apply for House',
      },

      // User Profile (Visitor)
      user: {
        accountInfo: 'Account Information',
        email: 'Email',
        firstName: 'First Name',
        lastName: 'Last Name',
        role: 'Role',
        becomeVendor: 'Become a Vendor',
        becomeVendorDescription: 'Upgrade your account to a vendor account to apply for vendor spaces at fairs, manage your business profile, and participate in upcoming events.',
        becomeVendorButton: 'Become a Vendor',
        benefit1: 'Apply for vendor spaces',
        benefit2: 'Manage your business profile',
        benefit3: 'Participate in fair events',
        confirmUpgrade: 'Confirm Account Upgrade',
        confirmUpgradeMessage: 'Are you sure you want to upgrade your account to a vendor account? This will give you access to the vendor dashboard where you can manage your business and apply for fair spaces.',
        upgradeError: 'Failed to upgrade to vendor. Please try again.',
        upgradeSuccess: 'Successfully upgraded to vendor!',
      },

      // About
      about: {
        title: 'About Us',
        subtitle: 'Learn more about Fair Marketplace',
        mission: 'Our Mission',
        history: 'Our History',
        team: 'Our Team',
        contact: 'Contact Us',
        pastEvents: 'Past Events',
        upcomingEvents: 'Upcoming Events',
        vendors: 'Vendors',
        vendor: 'vendor',
        status: {
          live: 'Live Now',
          upcoming: 'Coming Soon',
          completed: 'Completed',
        },
        expand: 'Expand',
        collapse: 'Collapse',
        participatingVendors: 'Participating Vendors',
      },

      // Errors
      errors: {
        notFound: 'Page not found',
        unauthorized: 'Unauthorized access',
        serverError: 'Something went wrong',
        networkError: 'Network error. Please try again.',
        required: 'This field is required',
        invalidEmail: 'Please enter a valid email',
        invalidPhone: 'Please enter a valid phone number',
        fileTooLarge: 'File is too large',
        invalidFormat: 'Invalid file format',
      },

      // Success Messages
      success: {
        saved: 'Saved successfully',
        created: 'Created successfully',
        deleted: 'Deleted successfully',
        applicationSubmitted: 'Application submitted successfully',
        profileUpdated: 'Profile updated successfully',
      },

      // Friends
      friends: {
        panel: {
          title: 'Friends on the map',
          addButton: 'Add friend',
          empty: 'No friends yet',
          count: 'Friends ({{count}})',
        },
        card: {
          online: 'Online',
          offline: 'Offline',
          distance: '{{distance}} km away',
          lastSeen: 'Last seen {{time}} ago',
          showOnMap: 'Show on map',
          distanceUnknown: 'Distance unknown',
        },
        sort: {
          label: 'Sort by',
          closest: 'Closest first',
          name: 'Name (A-Z)',
          online: 'Online first',
        },
        invite: {
          copied: 'Invite link copied!',
          shared: 'Invite shared!',
          failed: 'Failed to create invite link',
          loginRequired: 'Please log in to invite friends',
        },
        tab: 'Friends',
      },

      // AI Chat
      aiChat: {
        title: 'AI Assistant',
        welcome: "Hi! I'm your Fair Marketplace assistant. Ask me about fairs or the map!",
        placeholder: 'Ask about fairs, vendors...',
        send: 'Send',
        open: 'Open AI chat',
        error: 'Failed to get response. Please try again.',
      },
    },
  },
  az: {
    translation: {
      // Common
      common: {
        loading: 'Yüklənir...',
        close: 'Bağla',
        save: 'Yadda saxla',
        cancel: 'Ləğv et',
        delete: 'Sil',
        edit: 'Redaktə et',
        create: 'Yarat',
        search: 'Axtar',
        filter: 'Filtr',
        clearFilters: 'Filtrləri təmizlə',
        noResults: 'Nəticə tapılmadı',
        confirm: 'Təsdiq et',
        yes: 'Bəli',
        no: 'Xeyr',
        continue: 'Davam et',
      },

      // Navigation
      nav: {
        home: 'Ana səhifə',
        browseMap: 'Xəritəyə bax',
        aboutUs: 'Haqqımızda',
        signIn: 'Daxil ol',
        signOut: 'Çıxış',
        dashboard: 'İdarə paneli',
        profile: 'Profil',
      },

      // Welcome/Home Page
      welcome: {
        title: 'Fair Marketplace-ə xoş gəlmisiniz',
        subtitle: 'Möhtəşəm yarmarkaları və satıcıları kəşf edin',
        countdown: {
          days: 'Gün',
          hours: 'Saat',
          minutes: 'Dəqiqə',
          seconds: 'Saniyə',
          fairIsLive: 'Yarmarka Başladı!',
          upcomingFair: 'Gələcək Yarmarka',
          viewOnMap: 'Xəritədə Bax',
        },
        cta: {
          browseMap: 'Xəritəyə Bax',
          applyVendor: 'Satıcı Kimi Müraciət Et',
        },
      },

      // Authentication
      auth: {
        login: 'Daxil ol',
        logout: 'Çıxış',
        password: 'Şifrə',
        googleLogin: 'Google ilə daxil ol',
        orContinueWith: 'və ya davam edin',
        selectRole: 'Rolunuzu seçin',
        roleVisitor: 'Ziyarətçi',
        roleVendor: 'Satıcı',
        roleDescription: {
          visitor: 'Yarmarkalara baxın və satıcıları araşdırın',
          vendor: 'Satıcı yerləri üçün müraciət edin və biznesinizi idarə edin',
        },
        // OAuth-related messages
        oauthError: 'Doğrulama Xətası',
        oauthFailed: 'Google doğrulaması uğursuz oldu. Yenidən cəhd edin.',
        accountDeactivated: 'Hesabınız deaktiv edilib.',
        noToken: 'Doğrulama tokeni alınmadı.',
        authenticating: 'Doğrulama tamamlanır...',
        pleaseWait: 'Xahiş edirik, giriş edərkən gözləyin.',
        redirecting: 'Giriş səhifəsinə yönləndirilir...',
        // Role selection (Feature 3 & 221)
        welcomeNewUser: 'Fair Marketplace-ə xoş gəlmisiniz!',
        selectRoleRequired: 'Davam etmək üçün rol seçin',
        roleNote: 'Profil parametrlərindən daha sonra satıcıya yüksəldə bilərsiniz.',
      },

      // Map
      map: {
        title: 'Xəritəyə Bax',
        vendorHouses: 'Satıcı Evləri',
        facilities: 'Obyektlər',
        available: 'Mövcud',
        occupied: 'Tutulub',
        view360: '360° Turuna Bax',
        filterByCategory: 'Kateqoriyaya görə filtrləyin',
        allCategories: 'Bütün Kateqoriyalar',
        filteredResults: '{{count}} ev göstərilir',
        searchLocation: 'Ünvan və ya yer axtar...',
        search: 'Axtar...',
        selectFairLabel: 'Yarmarkanı seçin',
        allFairs: 'Bütün yarmarkalar',
      },

      // Categories
      categories: {
        food_beverages: 'Yemək və İçkilər',
        handicrafts: 'Əl işləri',
        clothing: 'Geyim',
        accessories: 'Aksesuarlar',
        other: 'Digər',
      },

      // Facilities
      facilities: {
        restaurant: 'Restoran',
        cafe: 'Kafe',
        kids_zone: 'Uşaq Zonası',
        restroom: 'Tualet',
        taxi: 'Taksi',
        bus_stop: 'Avtobus Dayanacağı',
        parking: 'Parkinq',
      },

      // Applications
      applications: {
        title: 'Müraciətlər',
        new: 'Yeni Müraciət',
        status: {
          pending: 'Gözləyir',
          approved: 'Təsdiqlənib',
          rejected: 'Rədd edilib',
        },
        form: {
          companyName: 'Şirkət Adı',
          contactName: 'Əlaqə Şəxsi',
          email: 'E-poçt',
          phone: 'Telefon Nömrəsi',
          category: 'Məhsul Kateqoriyası',
          description: 'Biznes Təsviri',
          logo: 'Şirkət Loqosu',
          productImages: 'Məhsul Şəkilləri',
          preferredHouse: 'Seçilmiş Ev',
          submit: 'Müraciəti Göndər',
        },
      },

      // Bookings
      bookings: {
        title: 'Rezervasiyalarım',
        houseNumber: 'Ev #',
        fairName: 'Yarmarka',
        dates: 'Tarixlər',
        status: 'Status',
      },

      // Admin
      admin: {
        dashboard: 'Admin İdarə Paneli',
        fairManagement: 'Yarmarka İdarəetməsi',
        applicationReview: 'Müraciət Nəzərdən Keçirmə',
        mapManagement: 'Xəritə İdarəetməsi',
        userManagement: 'İstifadəçi İdarəetməsi',
        aboutUsEditor: 'Haqqımızda Redaktoru',
        adminLogs: 'Admin Qeydləri',
        export: {
          csv: 'CSV İxrac Et',
          pdf: 'PDF İxrac Et',
        },
      },

      // Vendor
      vendor: {
        dashboard: 'Satıcı İdarə Paneli',
        myApplications: 'Müraciətlərim',
        myBookings: 'Rezervasiyalarım',
        profile: 'Profil',
        applyForHouse: 'Ev üçün Müraciət Et',
      },

      // User Profile (Visitor)
      user: {
        accountInfo: 'Hesab Məlumatları',
        email: 'E-poçt',
        firstName: 'Ad',
        lastName: 'Soyad',
        role: 'Rol',
        becomeVendor: 'Satıcı Olun',
        becomeVendorDescription: 'Hesabınızı satıcı hesabına yüksəldin ki, yarmarkalarda satıcı yerləri üçün müraciət edə, biznes profilinizi idarə edə və gələcək tədbirlərdə iştirak edə biləsiniz.',
        becomeVendorButton: 'Satıcı Olun',
        benefit1: 'Satıcı yerləri üçün müraciət edin',
        benefit2: 'Biznes profilinizi idarə edin',
        benefit3: 'Yarmarka tədbirlərində iştirak edin',
        confirmUpgrade: 'Hesab Yüksəltməsini Təsdiq Edin',
        confirmUpgradeMessage: 'Hesabınızı satıcı hesabına yüksəltmək istədiyinizə əminsiniz? Bu sizə biznesinizi idarə edə və yarmarka yerləri üçün müraciət edə biləcəyiniz satıcı idarə panelinə giriş imkanı verəcək.',
        upgradeError: 'Satıcıya yüksəltmək alınmadı. Yenidən cəhd edin.',
        upgradeSuccess: 'Satıcıya uğurla yüksəldildi!',
      },

      // About
      about: {
        title: 'Haqqımızda',
        subtitle: 'Fair Marketplace haqqında ətraflı məlumat',
        mission: 'Missiyamız',
        history: 'Tariximiz',
        team: 'Komandamız',
        contact: 'Əlaqə',
        pastEvents: 'Keçmiş Tədbirlər',
        upcomingEvents: 'Gələcək Tədbirlər',
        vendors: 'Satıcılar',
        vendor: 'satıcı',
        status: {
          live: 'Canlı',
          upcoming: 'Tezliklə',
          completed: 'Bitmiş',
        },
        expand: 'Genişlət',
        collapse: 'Bağla',
        participatingVendors: 'İştirak Edən Satıcılar',
      },

      // Errors
      errors: {
        notFound: 'Səhifə tapılmadı',
        unauthorized: 'İcazəsiz giriş',
        serverError: 'Xəta baş verdi',
        networkError: 'Şəbəkə xətası. Yenidən cəhd edin.',
        required: 'Bu sahə tələb olunur',
        invalidEmail: 'Düzgün e-poçt daxil edin',
        invalidPhone: 'Düzgün telefon nömrəsi daxil edin',
        fileTooLarge: 'Fayl çox böyükdür',
        invalidFormat: 'Yanlış fayl formatı',
      },

      // Success Messages
      success: {
        saved: 'Uğurla yadda saxlanıldı',
        created: 'Uğurla yaradıldı',
        deleted: 'Uğurla silindi',
        applicationSubmitted: 'Müraciət uğurla göndərildi',
        profileUpdated: 'Profil uğurla yeniləndi',
      },

      // Friends
      friends: {
        panel: {
          title: 'Xəritədə dostlar',
          addButton: 'Dost əlavə et',
          empty: 'Hələ dost yoxdur',
          count: 'Dostlar ({{count}})',
        },
        card: {
          online: 'Onlayn',
          offline: 'Oflayn',
          distance: '{{distance}} km uzaqda',
          lastSeen: '{{time}} əvvəl görülüb',
          showOnMap: 'Xəritədə göstər',
          distanceUnknown: 'Məsafə bilinmir',
        },
        sort: {
          label: 'Sırala',
          closest: 'Ən yaxın',
          name: 'Ad (A-Z)',
          online: 'Əvvəl onlayn',
        },
        invite: {
          copied: 'Dəvət linki kopyalandı!',
          shared: 'Dəvət paylaşıldı!',
          failed: 'Dəvət linki yaradılmadı',
          loginRequired: 'Dostları dəvət etmək üçün daxil olun',
        },
        tab: 'Dostlar',
      },

      // AI Chat
      aiChat: {
        title: 'AI Köməkçi',
        welcome: 'Salam! Mən Fair Marketplace köməkçisiyəm. Yarmarkalar və xəritə haqqında sual verin!',
        placeholder: 'Yarmarkalar, satıcılar haqqında soruşun...',
        send: 'Göndər',
        open: 'AI çatı aç',
        error: 'Cavab alına bilmədi. Yenidən cəhd edin.',
      },
    },
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('language') || 'az', // Default to Azerbaijani
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
