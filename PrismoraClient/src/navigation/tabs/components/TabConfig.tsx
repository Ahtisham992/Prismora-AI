// TabConfig.js
import HomeStack from '../../stacks/HomeStack';
import DiscoverStack from '../../stacks/DiscoverStack';
import AddStack from '../../stacks/AddStack';
import NotificationsStack from '../../stacks/NotificationsStack';
import ProfileStack from '../../stacks/ProfileStack';

export const TAB_CONFIG = [
  { name: 'Home', component: HomeStack, icon: 'home', iconOutline: 'home-outline', isSpecial: false },
  { name: 'Discover', component: DiscoverStack, icon: 'search', iconOutline: 'search-outline', isSpecial: false },
  { name: 'Add', component: AddStack, icon: 'add', iconOutline: 'add', isSpecial: true },
  { name: 'Notifications', component: NotificationsStack, icon: 'notifications', iconOutline: 'notifications-outline', isSpecial: false },
  { name: 'Profile', component: ProfileStack, icon: 'person', iconOutline: 'person-outline', isSpecial: false },
];
