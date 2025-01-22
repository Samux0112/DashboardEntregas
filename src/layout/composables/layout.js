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
        { "elementType": "geometry", "stylers": [{ "color": "#ebe3cd" }] },
        { "elementType": "labels.text.fill", "stylers": [{ "color": "#523735" }] },
        { "elementType": "labels.text.stroke", "stylers": [{ "color": "#f5f1e6" }] },
        { "featureType": "administrative", "elementType": "geometry.stroke", "stylers": [{ "color": "#c9b2a6" }] },
        { "elementType": "geometry.stroke", "stylers": [{ "color": "#dcd2be" }] },
        { "elementType": "labels.text.fill", "stylers": [{ "color": "#ae9e90" }] },
        { "elementType": "geometry", "stylers": [{ "color": "#dfd2ae" }] },
        { "elementType": "geometry", "stylers": [{ "color": "#dfd2ae" }] },
        { "elementType": "labels.text.fill", "stylers": [{ "color": "#93817c" }] },
        { "elementType": "geometry.fill", "stylers": [{ "color": "#a5b076" }] },
        { "elementType": "labels.text.fill", "stylers": [{ "color": "#447530" }] },
        { "elementType": "geometry", "stylers": [{ "color": "#f5f1e6" }] },
        { "elementType": "geometry", "stylers": [{ "color": "#fdfcf8" }] },
        { "elementType": "geometry", "stylers": [{ "color": "#f8c967" }] },
        { "elementType": "geometry.stroke", "stylers": [{ "color": "#e9bc62" }] },
        { "elementType": "geometry", "stylers": [{ "color": "#e98d58" }] },
        { "elementType": "geometry.stroke", "stylers": [{ "color": "#db8555" }] },
        { "elementType": "labels.text.fill", "stylers": [{ "color": "#806b63" }] },
        { "elementType": "geometry", "stylers": [{ "color": "#dfd2ae" }] },
        { "elementType": "labels.text.fill", "stylers": [{ "color": "#8f7d77" }] },
        { "elementType": "labels.text.stroke", "stylers": [{ "color": "#ebe3cd" }] },
        { "elementType": "geometry", "stylers": [{ "color": "#dfd2ae" }] },
        { "elementType": "geometry.fill", "stylers": [{ "color": "#b9d3c2" }] },
        { "elementType": "labels.text.fill", "stylers": [{ "color": "#92998d" }] }
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