// Dark purple theme - matching enterprise design template
export const cls = {
  // Buttons
  btnPrimary:
    'px-5 py-2.5 bg-primary-600 text-white rounded-md font-semibold text-sm transition-all duration-200 hover:bg-primary-500 hover:shadow-lg hover:shadow-primary-600/30 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none',
  btnSecondary:
    'px-5 py-2.5 bg-transparent text-primary-300 border border-primary-400/50 rounded-md font-semibold text-sm transition-all duration-200 hover:bg-primary-600/20 hover:border-primary-400 disabled:opacity-40 disabled:cursor-not-allowed',
  btnDanger:
    'px-5 py-2.5 bg-red-600 text-white rounded-md font-semibold text-sm transition-all duration-200 hover:bg-red-500 hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed',
  btnGhost:
    'px-5 py-2.5 text-gray-300 rounded-md font-semibold text-sm transition-all duration-200 hover:bg-white/10 hover:text-white',

  // Form fields - dark floating label style
  inputField:
    'w-full px-4 py-3 bg-surface-800 border border-surface-400/50 rounded-md text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all duration-200',
  selectField:
    'w-full px-4 py-3 bg-surface-800 border border-surface-400/50 rounded-md text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all duration-200 appearance-none',

  // Cards
  card:
    'bg-surface-800 rounded-lg border border-surface-500/30 p-6 transition-all duration-300 hover:border-primary-500/30',
  cardFlat:
    'bg-surface-800 rounded-lg border border-surface-500/30',

  // Gradient text
  gradientText:
    'bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent',

  // Badges
  badge:
    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
  badgeSuccess:
    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/30',
  badgeWarning:
    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
  badgeError:
    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-300 border border-red-500/30',
  badgeInfo:
    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-500/20 text-primary-300 border border-primary-500/30',
};
