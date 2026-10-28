export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/booking/booking',
    'pages/my/my'
  ],
  subPackages: [
    {
      root: 'pages/admin',
      pages: [
        'dashboard/dashboard',
        'rooms/rooms',
        'bookings/bookings',
        'users/users',
        'detail/detail'
      ]
    }
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#2f54eb',
    navigationBarTitleText: '会议室预约',
    navigationBarTextStyle: 'white'
  }
})
