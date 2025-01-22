import Swal from 'sweetalert2';
import { computed, onMounted, onBeforeUnmount, reactive, watch } from 'vue';

const layoutConfig = reactive({
    preset: 'Aura',
    primary: 'orange',
    surface: null,
    darkTheme: false,
    menuMode: 'static',
    darkModeStyles: [
        { "elementType": "geometry", "stylers": [{ "color": "#2b2b2b" }] },
        { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
        { "elementType": "labels.text.fill", "stylers": [{ "color": "#8ec3b9" }] },
        { "elementType": "labels.text.stroke", "stylers": [{ "color": "#1a3646" }] },
        { "featureType": "administrative.country", "elementType": "geometry.stroke", "stylers": [{ "color": "#4b6878" }] },
        { "featureType": "administrative.land_parcel", "stylers": [{ "visibility": "off" }] },
        { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#c4d600" }] },
        { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#283d6a" }] },
        { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#6f9ba5" }] },
        { "featureType": "poi.park", "elementType": "geometry.fill", "stylers": [{ "color": "#023e58" }] },
        { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#38414e" }] },
        { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#212a37" }] },
        { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#9ca5b3" }] },
        { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#746855" }] },
        { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [{ "color": "#1f2835" }] },
        { "featureType": "road.highway", "elementType": "labels.text.fill", "stylers": [{ "color": "#f3d19c" }] },
        { "featureType": "transit", "elementType": "geometry", "stylers": [{ "color": "#2f3948" }] },
        { "featureType": "transit.station", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
        { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#17263c" }] },
        { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#515c6d" }] },
        { "featureType": "water", "elementType": "labels.text.stroke", "stylers": [{ "color": "#17263c" }] }
    ],
    lightModeStyles: [
        { "elementType": "geometry", "stylers": [{ "color": "#f5f5f5" }] },
        { "elementType": "labels.text.fill", "stylers": [{ "color": "#333333" }] },
        { "elementType": "labels.text.stroke", "stylers": [{ "color": "#ffffff" }] },
        { "featureType": "administrative", "elementType": "geometry.stroke", "stylers": [{ "color": "#e0e0e0" }] },
        { "elementType": "geometry.stroke", "stylers": [{ "color": "#bdbdbd" }] },
        { "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
        { "elementType": "geometry", "stylers": [{ "color": "#eeeeee" }] },
        { "elementType": "geometry.fill", "stylers": [{ "color": "#ffffff" }] },
        { "elementType": "labels.text.fill", "stylers": [{ "color": "#616161" }] },
        { "elementType": "geometry.fill", "stylers": [{ "color": "#e0e0e0" }] },
        { "elementType": "labels.text.fill", "stylers": [{ "color": "#9e9e9e" }] },
        { "elementType": "geometry.stroke", "stylers": [{ "color": "#bdbdbd" }] },
        { "elementType": "geometry", "stylers": [{ "color": "#eeeeee" }] },
        { "elementType": "geometry", "stylers": [{ "color": "#ffffff" }] },
        { "elementType": "geometry", "stylers": [{ "color": "#e0e0e0" }] },
        { "elementType": "geometry.stroke", "stylers": [{ "color": "#bdbdbd" }] },
        { "elementType": "geometry", "stylers": [{ "color": "#eeeeee" }] },
        { "elementType": "labels.text.fill", "stylers": [{ "color": "#616161" }] }
    ],
});

const layoutState = reactive({
    staticMenuDesktopInactive: false,
    overlayMenuActive: false,
    profileSidebarVisible: false,
    configSidebarVisible: false,
    staticMenuMobileActive: false,
    menuHoverActive: false,
    activeMenuItem: null,
});

export function useLayout() {
    const setActiveMenuItem = (item) => {
        layoutState.activeMenuItem = item.value || item;
    };

    const toggleDarkMode = () => {
        if (!document.startViewTransition) {
            executeDarkModeToggle();
            return;
        }

        document.startViewTransition(() => executeDarkModeToggle());
    };

    const executeDarkModeToggle = () => {
        layoutConfig.darkTheme = !layoutConfig.darkTheme;
        document.documentElement.classList.toggle('app-dark', layoutConfig.darkTheme);
    };

    const toggleMenu = () => {
        if (layoutConfig.menuMode === 'overlay') {
            layoutState.overlayMenuActive = !layoutState.overlayMenuActive;
        }

        if (window.innerWidth > 991) {
            layoutState.staticMenuDesktopInactive = !layoutState.staticMenuDesktopInactive;
        } else {
            layoutState.staticMenuMobileActive = !layoutState.staticMenuMobileActive;
        }
    };

    const isSidebarActive = computed(() => layoutState.overlayMenuActive || layoutState.staticMenuMobileActive);

    const isDarkTheme = computed(() => layoutConfig.darkTheme);

    const getPrimary = computed(() => layoutConfig.primary);

    const getSurface = computed(() => layoutConfig.surface);

    const getDarkModeStyles = computed(() => layoutConfig.darkModeStyles);

    const getLightModeStyles = computed(() => layoutConfig.lightModeStyles);

    const updateDarkModeFromSystem = () => {
        const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        layoutConfig.darkTheme = isSystemDark;
        document.documentElement.classList.toggle('app-dark', isSystemDark);
    };

    onMounted(() => {
        updateDarkModeFromSystem();
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateDarkModeFromSystem);
    });

    onBeforeUnmount(() => {
        window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', updateDarkModeFromSystem);
    });

    watch(() => layoutConfig.darkTheme, (newVal) => {
        document.documentElement.classList.toggle('app-dark', newVal);
    });

    const showAlert = (titleOrOptions, text = '', icon = '', customOptions = {}) => {
        const isDark = layoutConfig.darkTheme;
        const primaryColor = getPrimary.value;
        const backgroundColor = isDark ? "#09090b" : "#ffffff";
        const textColor = isDark ? "#ffffff" : "#000000";

        let options = {};

        if (typeof titleOrOptions === 'object') {
            options = {
                background: backgroundColor,
                color: textColor,
                confirmButtonColor: primaryColor,
                ...titleOrOptions,
            };
        } else {
            options = {
                title: titleOrOptions,
                text,
                icon,
                background: backgroundColor,
                color: textColor,
                confirmButtonColor: primaryColor,
                ...customOptions,
            };
        }

        return Swal.fire(options);
    };

    const closeAlert = () => {
        Swal.close();
    };

    return {
        layoutConfig,
        layoutState,
        toggleMenu,
        isSidebarActive,
        isDarkTheme,
        getPrimary,
        getSurface,
        getDarkModeStyles,
        getLightModeStyles,
        setActiveMenuItem,
        toggleDarkMode,
        showAlert,
        closeAlert,
    };
}