// ── i18n Translations ────────────────────────────────
const translations = {
  en: {
    'hero.title': 'Book Your Journey',
    'hero.subtitle': 'Search and book flights with HorizonView',
    'hero.getStarted': 'Get Started',
    'hero.signIn': 'Sign In',
    'nav.flights': 'Flights',
    'nav.reservations': 'My Reservations',
    'nav.manage': 'Manage Flights',
    'nav.users': 'Users',
    'auth.login': 'Login',
    'auth.register': 'Register',
    'auth.logout': 'Logout',
    'auth.welcomeBack': 'Welcome Back',
    'auth.createAccount': 'Create Account',
    'auth.username': 'Username',
    'auth.password': 'Password',
    'auth.fullName': 'Full Name',
    'auth.email': 'Email',
    'auth.phone': 'Phone (optional)',
    'auth.noAccount': 'No account?',
    'auth.registerHere': 'Register here',
    'auth.haveAccount': 'Have an account?',
    'auth.loginHere': 'Login here',
    'auth.pleaseWait': 'Please wait\u2026',
    'profile.title': 'Edit Profile',
    'profile.changePassword': 'Change Password (optional)',
    'profile.currentPassword': 'Current Password',
    'profile.newPassword': 'New Password',
    'profile.confirmPassword': 'Confirm New Password',
    'profile.save': 'Save Changes',
    'profile.saving': 'Saving\u2026',
    'flights.find': 'Find Flights',
    'flights.from': 'From (IATA)',
    'flights.to': 'To (IATA)',
    'flights.date': 'Date',
    'flights.search': 'Search',
    'flights.searching': 'Searching\u2026',
    'flights.clear': 'Clear',
    'flights.available': 'Available Flights',
    'flights.all': 'All Flights',
    'flights.found': 'found',
    'flights.noFlights': 'No flights found. Try adjusting your filters.',
    'flights.seatsLeft': 'seats left',
    'flights.full': 'Full',
    'flights.book': 'Book',
    'flights.loginToBook': 'Login to Book',
    'seat.selectTitle': 'Select Your Seat',
    'seat.available': 'Available',
    'seat.reserved': 'Reserved',
    'seat.selected': 'Selected',
    'seat.confirmBooking': 'Confirm Booking',
    'seat.booking': 'Booking\u2026',
    'reservations.title': 'My Reservations',
    'reservations.total': 'total',
    'reservations.none': 'No reservations yet. Find a flight and book your seat!',
    'reservations.cancel': 'Cancel',
    'reservations.cancelConfirm': 'Cancel this reservation? This cannot be undone.',
    'manager.title': 'Flight Management',
    'manager.createTitle': 'Create New Flight',
    'manager.flightNumber': 'Flight Number',
    'manager.scheduledTime': 'Scheduled Time',
    'manager.totalSeats': 'Total Seats (30\u2013300)',
    'manager.createFlight': 'Create Flight',
    'manager.creating': 'Creating\u2026',
    'manager.manageFlights': 'Manage Flights',
    'manager.noFlights': 'No flights yet.',
    'manager.checkAirports': 'Check Airports',
    'manager.checking': 'Checking\u2026',
    'manager.airportFree': 'Free',
    'manager.airportBusy': 'Congested',
    'admin.title': 'User Management',
    'admin.filterRole': 'Filter by Role',
    'admin.allRoles': 'All Roles',
    'admin.refresh': 'Refresh',
    'admin.loading': 'Loading\u2026',
    'admin.noUsers': 'No users found.',
    'admin.apply': 'Apply',
    'weather.departure': 'Departure Weather',
    'weather.arrival': 'Arrival Weather',
    'weather.unavailable': 'Weather data unavailable',
    'weather.loading': 'Loading weather\u2026',
    'weather.wind': 'Wind',
    'weather.humidity': 'Humidity',
    'weather.feelsLike': 'Feels like',
    'currency.label': 'Currency',
    'footer.copyright': '\u00a9 2026 HorizonView \u2014 Internet Programming Course',
    'common.prev': '\u2190 Prev',
    'common.next': 'Next \u2192',
    'common.page': 'Page',
    'common.of': 'of',
  },
  el: {
    'hero.title': '\u039a\u03bb\u03b5\u03af\u03c3\u03c4\u03b5 \u03c4\u03bf \u03a4\u03b1\u03be\u03af\u03b4\u03b9 \u03c3\u03b1\u03c2',
    'hero.subtitle': '\u0391\u03bd\u03b1\u03b6\u03b7\u03c4\u03ae\u03c3\u03c4\u03b5 \u03ba\u03b1\u03b9 \u03ba\u03bb\u03b5\u03af\u03c3\u03c4\u03b5 \u03c0\u03c4\u03ae\u03c3\u03b5\u03b9\u03c2 \u03bc\u03b5 \u03c4\u03bf HorizonView',
    'hero.getStarted': '\u039e\u03b5\u03ba\u03b9\u03bd\u03ae\u03c3\u03c4\u03b5',
    'hero.signIn': '\u03a3\u03cd\u03bd\u03b4\u03b5\u03c3\u03b7',
    'nav.flights': '\u03a0\u03c4\u03ae\u03c3\u03b5\u03b9\u03c2',
    'nav.reservations': '\u039f\u03b9 \u039a\u03c1\u03b1\u03c4\u03ae\u03c3\u03b5\u03b9\u03c2 \u03bc\u03bf\u03c5',
    'nav.manage': '\u0394\u03b9\u03b1\u03c7\u03b5\u03af\u03c1\u03b9\u03c3\u03b7 \u03a0\u03c4\u03ae\u03c3\u03b5\u03c9\u03bd',
    'nav.users': '\u03a7\u03c1\u03ae\u03c3\u03c4\u03b5\u03c2',
    'auth.login': '\u03a3\u03cd\u03bd\u03b4\u03b5\u03c3\u03b7',
    'auth.register': '\u0395\u03b3\u03b3\u03c1\u03b1\u03c6\u03ae',
    'auth.logout': '\u0391\u03c0\u03bf\u03c3\u03cd\u03bd\u03b4\u03b5\u03c3\u03b7',
    'auth.welcomeBack': '\u039a\u03b1\u03bb\u03ce\u03c2 \u0389\u03c1\u03b8\u03b1\u03c4\u03b5',
    'auth.createAccount': '\u0394\u03b7\u03bc\u03b9\u03bf\u03c5\u03c1\u03b3\u03af\u03b1 \u039b\u03bf\u03b3\u03b1\u03c1\u03b9\u03b1\u03c3\u03bc\u03bf\u03cd',
    'auth.username': '\u038c\u03bd\u03bf\u03bc\u03b1 \u03c7\u03c1\u03ae\u03c3\u03c4\u03b7',
    'auth.password': '\u039a\u03c9\u03b4\u03b9\u03ba\u03cc\u03c2',
    'auth.fullName': '\u039f\u03bd\u03bf\u03bc\u03b1\u03c4\u03b5\u03c0\u03ce\u03bd\u03c5\u03bc\u03bf',
    'auth.email': 'Email',
    'auth.phone': '\u03a4\u03b7\u03bb\u03ad\u03c6\u03c9\u03bd\u03bf (\u03c0\u03c1\u03bf\u03b1\u03b9\u03c1\u03b5\u03c4\u03b9\u03ba\u03cc)',
    'auth.noAccount': '\u0394\u03b5\u03bd \u03ad\u03c7\u03b5\u03c4\u03b5 \u03bb\u03bf\u03b3\u03b1\u03c1\u03b9\u03b1\u03c3\u03bc\u03cc;',
    'auth.registerHere': '\u0395\u03b3\u03b3\u03c1\u03b1\u03c6\u03ae \u03b5\u03b4\u03ce',
    'auth.haveAccount': '\u0388\u03c7\u03b5\u03c4\u03b5 \u03bb\u03bf\u03b3\u03b1\u03c1\u03b9\u03b1\u03c3\u03bc\u03cc;',
    'auth.loginHere': '\u03a3\u03cd\u03bd\u03b4\u03b5\u03c3\u03b7 \u03b5\u03b4\u03ce',
    'auth.pleaseWait': '\u03a0\u03b1\u03c1\u03b1\u03ba\u03b1\u03bb\u03ce \u03c0\u03b5\u03c1\u03b9\u03bc\u03ad\u03bd\u03b5\u03c4\u03b5\u2026',
    'profile.title': '\u0395\u03c0\u03b5\u03be\u03b5\u03c1\u03b3\u03b1\u03c3\u03af\u03b1 \u03a0\u03c1\u03bf\u03c6\u03af\u03bb',
    'profile.changePassword': '\u0391\u03bb\u03bb\u03b1\u03b3\u03ae \u039a\u03c9\u03b4\u03b9\u03ba\u03bf\u03cd (\u03c0\u03c1\u03bf\u03b1\u03b9\u03c1\u03b5\u03c4\u03b9\u03ba\u03cc)',
    'profile.currentPassword': '\u03a4\u03c1\u03ad\u03c7\u03c9\u03bd \u039a\u03c9\u03b4\u03b9\u03ba\u03cc\u03c2',
    'profile.newPassword': '\u039d\u03ad\u03bf\u03c2 \u039a\u03c9\u03b4\u03b9\u03ba\u03cc\u03c2',
    'profile.confirmPassword': '\u0395\u03c0\u03b9\u03b2\u03b5\u03b2\u03b1\u03af\u03c9\u03c3\u03b7 \u039d\u03ad\u03bf\u03c5 \u039a\u03c9\u03b4\u03b9\u03ba\u03bf\u03cd',
    'profile.save': '\u0391\u03c0\u03bf\u03b8\u03ae\u03ba\u03b5\u03c5\u03c3\u03b7',
    'profile.saving': '\u0391\u03c0\u03bf\u03b8\u03ae\u03ba\u03b5\u03c5\u03c3\u03b7\u2026',
    'flights.find': '\u0391\u03bd\u03b1\u03b6\u03ae\u03c4\u03b7\u03c3\u03b7 \u03a0\u03c4\u03ae\u03c3\u03b5\u03c9\u03bd',
    'flights.from': '\u0391\u03c0\u03cc (IATA)',
    'flights.to': '\u03a0\u03c1\u03bf\u03c2 (IATA)',
    'flights.date': '\u0397\u03bc\u03b5\u03c1\u03bf\u03bc\u03b7\u03bd\u03af\u03b1',
    'flights.search': '\u0391\u03bd\u03b1\u03b6\u03ae\u03c4\u03b7\u03c3\u03b7',
    'flights.searching': '\u0391\u03bd\u03b1\u03b6\u03ae\u03c4\u03b7\u03c3\u03b7\u2026',
    'flights.clear': '\u039a\u03b1\u03b8\u03b1\u03c1\u03b9\u03c3\u03bc\u03cc\u03c2',
    'flights.available': '\u0394\u03b9\u03b1\u03b8\u03ad\u03c3\u03b9\u03bc\u03b5\u03c2 \u03a0\u03c4\u03ae\u03c3\u03b5\u03b9\u03c2',
    'flights.all': '\u038c\u03bb\u03b5\u03c2 \u03bf\u03b9 \u03a0\u03c4\u03ae\u03c3\u03b5\u03b9\u03c2',
    'flights.found': '\u03b2\u03c1\u03ad\u03b8\u03b7\u03ba\u03b1\u03bd',
    'flights.noFlights': '\u0394\u03b5\u03bd \u03b2\u03c1\u03ad\u03b8\u03b7\u03ba\u03b1\u03bd \u03c0\u03c4\u03ae\u03c3\u03b5\u03b9\u03c2. \u0394\u03bf\u03ba\u03b9\u03bc\u03ac\u03c3\u03c4\u03b5 \u03bd\u03b1 \u03b1\u03bb\u03bb\u03ac\u03be\u03b5\u03c4\u03b5 \u03c4\u03b1 \u03c6\u03af\u03bb\u03c4\u03c1\u03b1.',
    'flights.seatsLeft': '\u03b8\u03ad\u03c3\u03b5\u03b9\u03c2 \u03b4\u03b9\u03b1\u03b8\u03ad\u03c3\u03b9\u03bc\u03b5\u03c2',
    'flights.full': '\u03a0\u03bb\u03ae\u03c1\u03b7\u03c2',
    'flights.book': '\u039a\u03c1\u03ac\u03c4\u03b7\u03c3\u03b7',
    'flights.loginToBook': '\u03a3\u03c5\u03bd\u03b4\u03b5\u03b8\u03b5\u03af\u03c4\u03b5 \u03b3\u03b9\u03b1 \u039a\u03c1\u03ac\u03c4\u03b7\u03c3\u03b7',
    'seat.selectTitle': '\u0395\u03c0\u03b9\u03bb\u03ad\u03be\u03c4\u03b5 \u0398\u03ad\u03c3\u03b7',
    'seat.available': '\u0394\u03b9\u03b1\u03b8\u03ad\u03c3\u03b9\u03bc\u03b7',
    'seat.reserved': '\u039a\u03c1\u03b1\u03c4\u03b7\u03bc\u03ad\u03bd\u03b7',
    'seat.selected': '\u0395\u03c0\u03b9\u03bb\u03b5\u03b3\u03bc\u03ad\u03bd\u03b7',
    'seat.confirmBooking': '\u0395\u03c0\u03b9\u03b2\u03b5\u03b2\u03b1\u03af\u03c9\u03c3\u03b7 \u039a\u03c1\u03ac\u03c4\u03b7\u03c3\u03b7\u03c2',
    'seat.booking': '\u039a\u03c1\u03ac\u03c4\u03b7\u03c3\u03b7\u2026',
    'reservations.title': '\u039f\u03b9 \u039a\u03c1\u03b1\u03c4\u03ae\u03c3\u03b5\u03b9\u03c2 \u03bc\u03bf\u03c5',
    'reservations.total': '\u03c3\u03cd\u03bd\u03bf\u03bb\u03bf',
    'reservations.none': '\u0394\u03b5\u03bd \u03c5\u03c0\u03ac\u03c1\u03c7\u03bf\u03c5\u03bd \u03ba\u03c1\u03b1\u03c4\u03ae\u03c3\u03b5\u03b9\u03c2. \u0392\u03c1\u03b5\u03af\u03c4\u03b5 \u03bc\u03b9\u03b1 \u03c0\u03c4\u03ae\u03c3\u03b7 \u03ba\u03b1\u03b9 \u03ba\u03bb\u03b5\u03af\u03c3\u03c4\u03b5 \u03b8\u03ad\u03c3\u03b7!',
    'reservations.cancel': '\u0391\u03ba\u03cd\u03c1\u03c9\u03c3\u03b7',
    'reservations.cancelConfirm': '\u0391\u03ba\u03cd\u03c1\u03c9\u03c3\u03b7 \u03ba\u03c1\u03ac\u03c4\u03b7\u03c3\u03b7\u03c2; \u0394\u03b5\u03bd \u03bc\u03c0\u03bf\u03c1\u03b5\u03af \u03bd\u03b1 \u03b1\u03bd\u03b1\u03b9\u03c1\u03b5\u03b8\u03b5\u03af.',
    'manager.title': '\u0394\u03b9\u03b1\u03c7\u03b5\u03af\u03c1\u03b9\u03c3\u03b7 \u03a0\u03c4\u03ae\u03c3\u03b5\u03c9\u03bd',
    'manager.createTitle': '\u0394\u03b7\u03bc\u03b9\u03bf\u03c5\u03c1\u03b3\u03af\u03b1 \u039d\u03ad\u03b1\u03c2 \u03a0\u03c4\u03ae\u03c3\u03b7\u03c2',
    'manager.flightNumber': '\u0391\u03c1\u03b9\u03b8\u03bc\u03cc\u03c2 \u03a0\u03c4\u03ae\u03c3\u03b7\u03c2',
    'manager.scheduledTime': '\u03a0\u03c1\u03bf\u03b3\u03c1\u03b1\u03bc\u03bc\u03b1\u03c4\u03b9\u03c3\u03bc\u03ad\u03bd\u03b7 \u038f\u03c1\u03b1',
    'manager.totalSeats': '\u03a3\u03cd\u03bd\u03bf\u03bb\u03bf \u0398\u03ad\u03c3\u03b5\u03c9\u03bd (30\u2013300)',
    'manager.createFlight': '\u0394\u03b7\u03bc\u03b9\u03bf\u03c5\u03c1\u03b3\u03af\u03b1 \u03a0\u03c4\u03ae\u03c3\u03b7\u03c2',
    'manager.creating': '\u0394\u03b7\u03bc\u03b9\u03bf\u03c5\u03c1\u03b3\u03af\u03b1\u2026',
    'manager.manageFlights': '\u0394\u03b9\u03b1\u03c7\u03b5\u03af\u03c1\u03b9\u03c3\u03b7 \u03a0\u03c4\u03ae\u03c3\u03b5\u03c9\u03bd',
    'manager.noFlights': '\u0394\u03b5\u03bd \u03c5\u03c0\u03ac\u03c1\u03c7\u03bf\u03c5\u03bd \u03c0\u03c4\u03ae\u03c3\u03b5\u03b9\u03c2.',
    'manager.checkAirports': '\u0388\u03bb\u03b5\u03b3\u03c7\u03bf\u03c2 \u0391\u03b5\u03c1\u03bf\u03b4\u03c1\u03bf\u03bc\u03af\u03c9\u03bd',
    'manager.checking': '\u0388\u03bb\u03b5\u03b3\u03c7\u03bf\u03c2\u2026',
    'manager.airportFree': '\u0395\u03bb\u03b5\u03cd\u03b8\u03b5\u03c1\u03bf',
    'manager.airportBusy': '\u03a3\u03c5\u03bc\u03c6\u03cc\u03c1\u03b7\u03c3\u03b7',
    'admin.title': '\u0394\u03b9\u03b1\u03c7\u03b5\u03af\u03c1\u03b9\u03c3\u03b7 \u03a7\u03c1\u03b7\u03c3\u03c4\u03ce\u03bd',
    'admin.filterRole': '\u03a6\u03af\u03bb\u03c4\u03c1\u03bf \u03b1\u03bd\u03ac \u03a1\u03cc\u03bb\u03bf',
    'admin.allRoles': '\u038c\u03bb\u03bf\u03b9 \u03bf\u03b9 \u03a1\u03cc\u03bb\u03bf\u03b9',
    'admin.refresh': '\u0391\u03bd\u03b1\u03bd\u03ad\u03c9\u03c3\u03b7',
    'admin.loading': '\u03a6\u03cc\u03c1\u03c4\u03c9\u03c3\u03b7\u2026',
    'admin.noUsers': '\u0394\u03b5\u03bd \u03b2\u03c1\u03ad\u03b8\u03b7\u03ba\u03b1\u03bd \u03c7\u03c1\u03ae\u03c3\u03c4\u03b5\u03c2.',
    'admin.apply': '\u0395\u03c6\u03b1\u03c1\u03bc\u03bf\u03b3\u03ae',
    'weather.departure': '\u039a\u03b1\u03b9\u03c1\u03cc\u03c2 \u0391\u03bd\u03b1\u03c7\u03ce\u03c1\u03b7\u03c3\u03b7\u03c2',
    'weather.arrival': '\u039a\u03b1\u03b9\u03c1\u03cc\u03c2 \u0386\u03c6\u03b9\u03be\u03b7\u03c2',
    'weather.unavailable': '\u0394\u03b5\u03bd \u03c5\u03c0\u03ac\u03c1\u03c7\u03bf\u03c5\u03bd \u03b4\u03b5\u03b4\u03bf\u03bc\u03ad\u03bd\u03b1 \u03ba\u03b1\u03b9\u03c1\u03bf\u03cd',
    'weather.loading': '\u03a6\u03cc\u03c1\u03c4\u03c9\u03c3\u03b7 \u03ba\u03b1\u03b9\u03c1\u03bf\u03cd\u2026',
    'weather.wind': '\u0386\u03bd\u03b5\u03bc\u03bf\u03c2',
    'weather.humidity': '\u03a5\u03b3\u03c1\u03b1\u03c3\u03af\u03b1',
    'weather.feelsLike': '\u0391\u03af\u03c3\u03b8\u03b7\u03c3\u03b7',
    'currency.label': '\u039d\u03cc\u03bc\u03b9\u03c3\u03bc\u03b1',
    'footer.copyright': '\u00a9 2026 HorizonView \u2014 \u039c\u03ac\u03b8\u03b7\u03bc\u03b1 \u0394\u03b9\u03b1\u03b4\u03b9\u03ba\u03c4\u03c5\u03b1\u03ba\u03bf\u03cd \u03a0\u03c1\u03bf\u03b3\u03c1\u03b1\u03bc\u03bc\u03b1\u03c4\u03b9\u03c3\u03bc\u03bf\u03cd',
    'common.prev': '\u2190 \u03a0\u03c1\u03bf\u03b7\u03b3.',
    'common.next': '\u0395\u03c0\u03cc\u03bc. \u2192',
    'common.page': '\u03a3\u03b5\u03bb\u03af\u03b4\u03b1',
    'common.of': '\u03b1\u03c0\u03cc',
  }
};

const API = '/api';

function getCsrfToken() {
  const match = document.cookie.split('; ').find(c => c.startsWith('csrf_token='));
  return match ? match.split('=')[1] : '';
}

function app() {
  return {
    // ── i18n state ───────────────────────────────────
    lang: localStorage.getItem('horizonview_lang') || 'en',

    // ── Currency state ───────────────────────────────
    selectedCurrency: 'EUR',
    exchangeRates: { base: 'EUR', rates: {} },

    // ── Auth state ────────────────────────────────────
    user: null,
    authFormVisible: false,
    authType: 'login',
    authError: '',
    authLoading: false,
    authForm: { username: '', password: '', name: '', email: '', phone: '' },

    // ── Profile modal ─────────────────────────────────
    profileOpen: false,
    profileForm: { name: '', email: '', currentPassword: '', newPassword: '', confirmPassword: '' },
    profileError: '',
    profileLoading: false,

    // ── Nav ───────────────────────────────────────────
    navOpen: false,

    // ── Flights ───────────────────────────────────────
    flights: [],
    flightsLoading: false,
    filters: { from: '', to: '', date: '' },
    pagination: { page: 1, limit: 20, total: 0, pages: 0 },

    // ── Reservations ──────────────────────────────────
    reservations: [],

    // ── Seat Map Modal ────────────────────────────────
    seatModal: {
      open: false,
      flight: null,
      seats: [],
      selectedSeat: null,
      loading: false,
      confirming: false,
      weather: { departure: null, arrival: null, loading: false }
    },

    // ── Manager ───────────────────────────────────────
    createFlightForm: { flight_number: '', departure: '', arrival: '', scheduled_time: '', total_seats: 150 },
    createFlightLoading: false,
    airportStatus: { departure: null, arrival: null },
    airportStatusLoading: false,

    // ── Admin ─────────────────────────────────────────
    users: [],
    usersLoading: false,
    userFilters: { role: '', page: 1 },
    userPagination: { total: 0, pages: 0 },
    roleChangeTo: {},

    // ── Toasts ────────────────────────────────────────
    toasts: [],

    // ═══════════════════════════════════════════════════
    //  i18n
    // ═══════════════════════════════════════════════════
    t(key) {
      return translations[this.lang]?.[key] || translations.en[key] || key;
    },

    toggleLang() {
      this.lang = this.lang === 'en' ? 'el' : 'en';
      document.documentElement.lang = this.lang;
      localStorage.setItem('horizonview_lang', this.lang);
    },

    async detectLanguage() {
      const stored = localStorage.getItem('horizonview_lang');
      if (stored) {
        this.lang = stored;
        document.documentElement.lang = stored;
        return;
      }
      try {
        const data = await this.request('/external/detect-language');
        this.lang = data.data?.language || 'en';
        document.documentElement.lang = this.lang;
        localStorage.setItem('horizonview_lang', this.lang);
      } catch {
        this.lang = 'en';
      }
    },

    // ═══════════════════════════════════════════════════
    //  Currency
    // ═══════════════════════════════════════════════════
    async loadExchangeRates() {
      try {
        const data = await this.request('/external/exchange-rates?symbols=USD,GBP');
        this.exchangeRates = data.data || { base: 'EUR', rates: { USD: 1.08, GBP: 0.86 } };
      } catch {
        this.exchangeRates = { base: 'EUR', rates: { USD: 1.08, GBP: 0.86 } };
      }
    },

    formatPrice(eurPrice) {
      if (!eurPrice && eurPrice !== 0) return '';
      if (this.selectedCurrency === 'EUR') return `\u20ac${eurPrice}`;
      const rate = this.exchangeRates.rates[this.selectedCurrency];
      if (!rate) return `\u20ac${eurPrice}`;
      const converted = (eurPrice * rate).toFixed(2);
      const sym = { USD: '$', GBP: '\u00a3' };
      return `${sym[this.selectedCurrency] || this.selectedCurrency + ' '}${converted}`;
    },

    // ═══════════════════════════════════════════════════
    //  Init
    // ═══════════════════════════════════════════════════
    async init() {
      await this.detectLanguage();
      this.loadExchangeRates(); // fire and forget — no await
      await this.checkAuth();
      await this.loadFlights();
      if (this.user && this.user.role !== 'visitor') {
        await this.loadReservations();
      }
      if (this.user?.role === 'admin') {
        await this.loadUsers();
      }
    },

    // ═══════════════════════════════════════════════════
    //  Core request helper
    // ═══════════════════════════════════════════════════
    async request(endpoint, options = {}, _isRetry = false) {
      const method = (options.method || 'GET').toUpperCase();
      const mutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

      const res = await fetch(`${API}${endpoint}`, {
        ...options,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(mutating ? { 'X-CSRF-Token': getCsrfToken() } : {}),
          ...options.headers
        }
      });

      if (res.status === 204) return { success: true };

      if (res.status === 401 && !_isRetry && endpoint !== '/auth/me') {
        try {
          const refreshRes = await fetch(`${API}/auth/refresh`, {
            method: 'POST', credentials: 'include',
            headers: { 'X-CSRF-Token': getCsrfToken() }
          });
          if (refreshRes.ok) return this.request(endpoint, options, true);
        } catch { /* refresh failed */ }
        this.user = null;
        this.reservations = [];
      }

      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || 'Request failed');
      return data;
    },

    // ═══════════════════════════════════════════════════
    //  Auth
    // ═══════════════════════════════════════════════════
    async checkAuth() {
      try {
        const data = await this.request('/auth/me');
        this.user = data.data;
      } catch {
        this.user = null;
      }
    },

    showAuth(type) {
      this.authType = type;
      this.authFormVisible = true;
      this.authError = '';
      this.authForm = { username: '', password: '', name: '', email: '', phone: '' };
    },

    async handleAuth() {
      this.authError = '';
      this.authLoading = true;
      try {
        if (this.authType === 'login') {
          await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username: this.authForm.username, password: this.authForm.password })
          });
        } else {
          const body = {
            username: this.authForm.username,
            password: this.authForm.password,
            name: this.authForm.name,
            email: this.authForm.email
          };
          if (this.authForm.phone) body.phone = this.authForm.phone;
          await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(body)
          });
        }
        this.authFormVisible = false;
        this.authForm = { username: '', password: '', name: '', email: '', phone: '' };
        await this.checkAuth();
        if (this.user?.role !== 'visitor') await this.loadReservations();
        if (this.user?.role === 'admin') await this.loadUsers();
        await this.loadFlights();
        this.showToast(`Welcome, ${this.user?.name || 'back'}!`, 'success');
      } catch (err) {
        this.authError = err.message;
      } finally {
        this.authLoading = false;
      }
    },

    async logout() {
      try {
        await this.request('/auth/logout', { method: 'POST' });
      } catch (err) {
        this.showToast('Logout failed \u2014 ' + err.message, 'error');
        return;
      }
      this.user = null;
      this.reservations = [];
      this.users = [];
      this.authFormVisible = false;
      await this.loadFlights();
      this.showToast(this.lang === 'el' ? '\u0395\u03c0\u03b9\u03c4\u03c5\u03c7\u03ae\u03c2 \u03b1\u03c0\u03bf\u03c3\u03cd\u03bd\u03b4\u03b5\u03c3\u03b7' : 'Logged out successfully', 'info');
    },

    // ═══════════════════════════════════════════════════
    //  Profile
    // ═══════════════════════════════════════════════════
    openProfile() {
      this.profileForm = {
        name: this.user?.name || '',
        email: this.user?.email || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      };
      this.profileError = '';
      this.profileOpen = true;
    },

    async saveProfile() {
      this.profileError = '';

      if (this.profileForm.newPassword && this.profileForm.newPassword !== this.profileForm.confirmPassword) {
        this.profileError = 'New passwords do not match';
        return;
      }

      const body = {};
      if (this.profileForm.name  !== this.user.name)  body.name  = this.profileForm.name;
      if (this.profileForm.email !== this.user.email) body.email = this.profileForm.email;
      if (this.profileForm.newPassword) {
        body.currentPassword = this.profileForm.currentPassword;
        body.newPassword     = this.profileForm.newPassword;
      }

      if (!Object.keys(body).length) {
        this.profileError = 'No changes to save';
        return;
      }

      this.profileLoading = true;
      try {
        const data = await this.request('/auth/profile', {
          method: 'PATCH',
          body: JSON.stringify(body)
        });
        this.user = { ...this.user, ...data.data };
        this.profileOpen = false;
        this.showToast('Profile updated', 'success');
      } catch (err) {
        this.profileError = err.message;
      } finally {
        this.profileLoading = false;
      }
    },

    // ═══════════════════════════════════════════════════
    //  Flights
    // ═══════════════════════════════════════════════════
    async loadFlights(page = 1) {
      this.flightsLoading = true;
      this.pagination.page = page;
      try {
        const params = new URLSearchParams();
        if (this.filters.from) params.append('from', this.filters.from.toUpperCase());
        if (this.filters.to)   params.append('to',   this.filters.to.toUpperCase());
        if (this.filters.date) params.append('date',  this.filters.date);
        params.append('page',  String(page));
        params.append('limit', String(this.pagination.limit));

        const data = await this.request(`/flights?${params}`);
        this.flights = data.data || [];
        if (data.pagination) {
          this.pagination = { ...this.pagination, ...data.pagination };
        }
      } catch (err) {
        this.showToast(err.message, 'error');
      } finally {
        this.flightsLoading = false;
      }
    },

    searchFlights() {
      this.loadFlights(1);
    },

    // ═══════════════════════════════════════════════════
    //  Seat Map Modal
    // ═══════════════════════════════════════════════════
    async openSeatMap(flight) {
      if (!this.user) { this.showAuth('login'); return; }

      this.seatModal = {
        open: true, flight, seats: [], selectedSeat: null,
        loading: true, confirming: false,
        weather: { departure: null, arrival: null, loading: true }
      };

      try {
        const data = await this.request(`/flights/${flight.id}/seats`);
        this.seatModal.seats = data.data?.seats || [];
      } catch (err) {
        this.showToast(err.message, 'error');
        this.seatModal.open = false;
      } finally {
        this.seatModal.loading = false;
      }

      // Load weather for departure and arrival in background
      this.loadSeatModalWeather(flight.departure, flight.arrival);
    },

    async loadSeatModalWeather(dep, arr) {
      try {
        const [depRes, arrRes] = await Promise.all([
          this.request(`/external/weather?location=${encodeURIComponent(dep)}`),
          this.request(`/external/weather?location=${encodeURIComponent(arr)}`)
        ]);
        this.seatModal.weather = {
          departure: depRes.data,
          arrival: arrRes.data,
          loading: false
        };
      } catch {
        this.seatModal.weather = { departure: null, arrival: null, loading: false };
      }
    },

    selectSeat(seat) {
      if (seat.status === 'reserved') return;
      this.seatModal.selectedSeat =
        this.seatModal.selectedSeat?.number === seat.number ? null : seat;
    },

    closeSeatModal() { this.seatModal.open = false; },

    async confirmBooking() {
      const { flight, selectedSeat } = this.seatModal;
      if (!selectedSeat) return;
      this.seatModal.confirming = true;
      try {
        await this.request('/reservations', {
          method: 'POST',
          body: JSON.stringify({ flight_id: flight.id, seat_number: selectedSeat.number, ticket_type: selectedSeat.class })
        });
        this.seatModal.open = false;
        await this.loadReservations();
        await this.loadFlights(this.pagination.page);
        this.showToast(`Seat ${selectedSeat.number} booked!`, 'success');
      } catch (err) {
        this.showToast(err.message, 'error');
      } finally {
        this.seatModal.confirming = false;
      }
    },

    seatCountFor(cls) {
      const seats = this.seatModal.seats.filter(s => s.class === cls);
      const avail = seats.filter(s => s.status === 'available').length;
      return `${avail} / ${seats.length} available`;
    },

    // ═══════════════════════════════════════════════════
    //  Reservations
    // ═══════════════════════════════════════════════════
    async loadReservations() {
      try {
        const data = await this.request('/reservations');
        this.reservations = data.data || [];
      } catch (err) {
        this.showToast(err.message, 'error');
      }
    },

    async cancelReservation(id) {
      if (!confirm(this.t('reservations.cancelConfirm'))) return;
      try {
        await this.request(`/reservations/${id}`, { method: 'DELETE' });
        await this.loadReservations();
        await this.loadFlights(this.pagination.page);
        this.showToast(this.t('reservations.cancel') + ' \u2714', 'info');
      } catch (err) {
        this.showToast(err.message, 'error');
      }
    },

    // ═══════════════════════════════════════════════════
    //  Manager — Flights
    // ═══════════════════════════════════════════════════
    async createFlight() {
      this.createFlightLoading = true;
      try {
        const f = this.createFlightForm;
        await this.request('/flights', {
          method: 'POST',
          body: JSON.stringify({
            flight_number:  f.flight_number.toUpperCase(),
            departure:      f.departure.toUpperCase(),
            arrival:        f.arrival.toUpperCase(),
            scheduled_time: new Date(f.scheduled_time).toISOString(),
            total_seats:    Number(f.total_seats)
          })
        });
        this.createFlightForm = { flight_number: '', departure: '', arrival: '', scheduled_time: '', total_seats: 150 };
        this.airportStatus = { departure: null, arrival: null };
        await this.loadFlights(1);
        this.showToast('Flight created successfully!', 'success');
      } catch (err) {
        this.showToast(err.message, 'error');
      } finally {
        this.createFlightLoading = false;
      }
    },

    async updateFlightState(flightId, state) {
      if (!confirm(`Mark this flight as "${state}"?`)) return;
      try {
        await this.request(`/flights/${flightId}/state`, {
          method: 'PATCH',
          body: JSON.stringify({ state })
        });
        await this.loadFlights(this.pagination.page);
        this.showToast(`Flight marked as ${state}`, 'success');
      } catch (err) {
        this.showToast(err.message, 'error');
      }
    },

    async deleteFlight(flightId) {
      if (!confirm('Delete this flight? All seats will also be removed. This cannot be undone.')) return;
      try {
        await this.request(`/flights/${flightId}`, { method: 'DELETE' });
        await this.loadFlights(this.pagination.page);
        this.showToast('Flight deleted', 'info');
      } catch (err) {
        this.showToast(err.message, 'error');
      }
    },

    // ═══════════════════════════════════════════════════
    //  Manager — Airport Congestion Check (Aviationstack)
    // ═══════════════════════════════════════════════════
    async checkAirportStatus() {
      const f = this.createFlightForm;
      if (!f.departure || f.departure.length < 3 || !f.arrival || f.arrival.length < 3 || !f.scheduled_time) {
        this.showToast('Fill in departure, arrival, and scheduled time first', 'info');
        return;
      }
      this.airportStatusLoading = true;
      this.airportStatus = { departure: null, arrival: null };
      try {
        const datetime = new Date(f.scheduled_time).toISOString();
        const [depRes, arrRes] = await Promise.all([
          this.request(`/external/airport-status?iata=${encodeURIComponent(f.departure.toUpperCase())}&datetime=${encodeURIComponent(datetime)}`),
          this.request(`/external/airport-status?iata=${encodeURIComponent(f.arrival.toUpperCase())}&datetime=${encodeURIComponent(datetime)}`)
        ]);
        this.airportStatus = { departure: depRes.data, arrival: arrRes.data };
      } catch (err) {
        this.showToast(err.message, 'error');
      } finally {
        this.airportStatusLoading = false;
      }
    },

    // ═══════════════════════════════════════════════════
    //  Admin — Users
    // ═══════════════════════════════════════════════════
    async loadUsers(page = 1) {
      this.usersLoading = true;
      this.userFilters.page = page;
      try {
        const params = new URLSearchParams();
        if (this.userFilters.role) params.append('role', this.userFilters.role);
        params.append('page', String(page));

        const data = await this.request(`/users?${params}`);
        this.users = data.data || [];
        this.userPagination = data.pagination || { total: 0, pages: 0 };

        this.roleChangeTo = {};
        this.users.forEach(u => { this.roleChangeTo[u.id] = u.role; });
      } catch (err) {
        this.showToast(err.message, 'error');
      } finally {
        this.usersLoading = false;
      }
    },

    async changeUserRole(userId) {
      const user = this.users.find(u => u.id === userId);
      const newRole = this.roleChangeTo[userId];
      if (!user || user.role === newRole) { this.showToast('No change selected', 'info'); return; }

      try {
        await this.request(`/users/${userId}/role`, {
          method: 'PATCH',
          body: JSON.stringify({ role: newRole })
        });
        await this.loadUsers(this.userFilters.page);
        this.showToast(`${user.username} is now a ${newRole}`, 'success');
      } catch (err) {
        this.showToast(err.message, 'error');
      }
    },

    // ═══════════════════════════════════════════════════
    //  Utilities
    // ═══════════════════════════════════════════════════
    formatDate(iso) {
      if (!iso) return '\u2014';
      const locale = this.lang === 'el' ? 'el-GR' : 'en-US';
      return new Date(iso).toLocaleString(locale, {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    },

    showToast(message, type = 'info') {
      const toast = { message, type };
      this.toasts.push(toast);
      setTimeout(() => {
        const i = this.toasts.indexOf(toast);
        if (i !== -1) this.toasts.splice(i, 1);
      }, 3500);
    }
  };
}
