import { dataService } from './dataService.js';
import { FilterManager } from './filters.js';
import { TableManager } from './table.js';
import { UIManager } from './ui.js';
import { updateTotalCourses } from './helpers.js';

class App {
  constructor() {
    // Initialize campus from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    this.currentCampus = urlParams.get('campus') || 'v';

    this.tableManager = new TableManager();
    this.uiManager = new UIManager();
    this.filterManager = new FilterManager(() => this.handleFilterChange());

    this.initialize();
  }

  async initialize() {
    // Add session change listener
    document.getElementById('sessionSelect')?.addEventListener('change', async (e) => {
      dataService.setSession(e.target.value);
      await this.loadInitialData(false);
    });

    await this.loadInitialData(true);
    this.setupEventListeners();
  }

  async loadInitialData(resetFilters = true) {
    try {
      if (resetFilters) {
        this.filterManager.clearFilters();
      }
      const data = await dataService.loadCourseData(this.currentCampus);

      const sortBy = document.getElementById('sortBy')?.value || 'code';

      const sortedData = dataService.sortCourses(data, sortBy);

      if (resetFilters) {
        this.filterManager.initializeFacultyFilter(data);
        this.filterManager.initializeYearLevelFilter();
        this.filterManager.initializeAverageFilter();
        this.filterManager.initializeStudentFilter();
        this.filterManager.initializeCreditFilter();
      }

      updateTotalCourses(data);
      this.tableManager.populateTable(sortedData, sortBy);
    } catch (error) {
      console.error('Failed to load initial data:', error);
    }
  }

  setupEventListeners() {
    // Campus toggle
    const campusToggle = document.getElementById('campusToggle');
    if (campusToggle) {
      // Set initial state from localStorage or URL
      const savedCampus = localStorage.getItem('selectedCampus');
      const urlParams = new URLSearchParams(window.location.search);
      this.currentCampus = savedCampus || urlParams.get('campus') || 'v';

      // Set toggle state
      campusToggle.checked = this.currentCampus === 'o';

      // Update URL to match saved state
      urlParams.set('campus', this.currentCampus);
      history.replaceState(null, '', `?${urlParams.toString()}`);

      campusToggle.addEventListener('change', async (e) => {
        this.currentCampus = e.target.checked ? 'o' : 'v';

        // Save to localStorage
        localStorage.setItem('selectedCampus', this.currentCampus);

        // Update URL
        const urlParams = new URLSearchParams(window.location.search);
        urlParams.set('campus', this.currentCampus);
        history.replaceState(null, '', `?${urlParams.toString()}`);

        dataService.clearCache();
        await this.loadInitialData();
        this.handleFilterChange();
      });
    }
    // Sort selection
    document.getElementById('sortBy')?.addEventListener('change', () => {
      this.handleFilterChange();
    });

    // Toggle all sections
    document.getElementById('toggleAll')?.addEventListener('click', () => {
      this.tableManager.toggleAllSections();
    });

    // Search input
    document.getElementById('searchInput')?.addEventListener('input', (e) => {
      this.handleFilterChange();
    });
  }

  async handleCampusChange() {
    try {
      this.filterManager.clearFilters(); // Clear existing filters first
      dataService.clearCache();
      const data = await dataService.loadCourseData(this.currentCampus);
      this.filterManager.initializeFacultyFilter(data);
      this.filterManager.initializeYearLevelFilter();
      this.filterManager.initializeAverageFilter();
      this.handleFilterChange();
    } catch (error) {
      console.error('Failed to change campus:', error);
    }
  }

  handleFilterChange(isPageChange = false) {
    if (!isPageChange) {
      this.tableManager.currentPage = 1;
    }

    const sortBy = document.getElementById('sortBy')?.value || 'code';
    const filters = this.filterManager.getSelectedFilters();

    let filteredCourses = dataService.filterCourses(filters);
    filteredCourses = dataService.sortCourses(filteredCourses, sortBy);

    this.uiManager.updateToggleButtonVisibility(sortBy);
    // Only update total count when filters change, not during pagination
    if (!isPageChange) {
      updateTotalCourses(filteredCourses);
    }
    this.tableManager.populateTable(filteredCourses, sortBy);
  }
}

const app = new App();
window.app = app;
