import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Translation resources
const resources = {
  en: {
    translation: {
      // Common
      common: {
        loading: 'Loading...',
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
        googleLogin: 'Sign in with Google',
        selectRole: 'Select Your Role',
        roleVisitor: 'Visitor',
        roleVendor: 'Vendor',
        roleDescription: {
          visitor: 'Browse fairs and explore vendors',
          vendor: 'Apply for vendor spaces and manage your business',
        },
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

      // About
      about: {
        title: 'About Us',
        mission: 'Our Mission',
        pastEvents: 'Past Events',
        upcomingEvents: 'Upcoming Events',
        vendors: 'Vendors',
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
    },
  },
  az: {
    translation: {
      // Common
      common: {
        loading: 'Yüklənir...',
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
        googleLogin: 'Google ilə daxil ol',
        selectRole: 'Rolunuzu seçin',
        roleVisitor: 'Ziyarətçi',
        roleVendor: 'Satıcı',
        roleDescription: {
          visitor: 'Yarmarkalara baxın və satıcıları araşdırın',
          vendor: 'Satıcı yerləri üçün müraciət edin və biznesinizi idarə edin',
        },
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

      // About
      about: {
        title: 'Haqqımızda',
        mission: 'Missiyamız',
        pastEvents: 'Keçmiş Tədbirlər',
        upcomingEvents: 'Gələcək Tədbirlər',
        vendors: 'Satıcılar',
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
