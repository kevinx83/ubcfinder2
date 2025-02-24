export class PrerequisitesManager {
  constructor() {
      this.prerequisitesElement = document.getElementById('prerequisites');
      this.corequisitesElement = document.getElementById('corequisites');
      this.dependenciesElement = document.getElementById('dependencies');
  }

  makeCollapsible(element, content) {
        if (!element) return;

        // Create wrapper and button
        const wrapper = document.createElement('div');
        wrapper.className = 'section-content';
        wrapper.innerHTML = content;

        const button = document.createElement('button');
        button.className = 'show-more-btn';
        button.textContent = 'Show More';
        button.type = 'button'; // Explicitly set button type

        // Replace original content
        element.innerHTML = '';
        element.appendChild(wrapper);

        // Check if content needs truncation
        if (wrapper.scrollHeight > 48) {
            wrapper.classList.add('truncated');
            element.appendChild(button);

            // Add click handler
            button.addEventListener('click', () => {
                wrapper.classList.toggle('expanded');
                button.textContent = wrapper.classList.contains('expanded') ? 'Show Less' : 'Show More';
            });
        }
    }

  update(prereqData) {
      if (!prereqData) {
          const unavailableMessage = '<p>Data unavailable</p>';
          this.makeCollapsible(this.prerequisitesElement, unavailableMessage);
          this.makeCollapsible(this.corequisitesElement, unavailableMessage);
          this.makeCollapsible(this.dependenciesElement, unavailableMessage);
          return;
      }

      // Update prerequisites
      const prerequisites = this.getPrerequisites(prereqData);
      this.makeCollapsible(this.prerequisitesElement, `<p>${prerequisites}</p>`);

      // Update corequisites
      const corequisites = this.getCorequisites(prereqData);
      this.makeCollapsible(this.corequisitesElement, `<p>${corequisites}</p>`);

      // Update dependencies
      const dependencies = this.createCourseLinks(prereqData.depn) || 'None';
      this.makeCollapsible(this.dependenciesElement, `<p>${dependencies}</p>`);
  }
  
    getPrerequisites(prereqData) {
      if (prereqData?.prer) {
        return this.createCourseLinks(prereqData.prer);
      } else if (Array.isArray(prereqData?.preq) && prereqData.preq.length > 0) {
        return this.createCourseLinks(prereqData.preq);
      } else {
        return 'None';
      }
    }
  
    getCorequisites(prereqData) {
      if (prereqData?.crer) {
        return this.createCourseLinks(prereqData.crer);
      } else if (Array.isArray(prereqData?.creq) && prereqData.creq.length > 0) {
        return this.createCourseLinks(prereqData.creq);
      } else {
        return 'None';
      }
    }
  
    createCourseLinks(text) {
      if (text === undefined) {
        return 'No information available';
      }
  
      if (Array.isArray(text) && text.length === 0) {
        return 'None';
      }
  
      if (Array.isArray(text)) {
        return text.map(course => this.createSingleCourseLink(course)).join(', ');
      }
  
      const courseCodeRegex = /([A-Z]{2,4})\s*(\d{3}[A-Z]?)/g;
      text = text.replace(/,\s*,/g, ',').replace(/\s+/g, ' ').trim();
  
      return text.replace(courseCodeRegex, (match, dept, num) => {
        return this.createSingleCourseLink(`${dept} ${num}`);
      });
    }
  
    createSingleCourseLink(courseCode) {
      const urlParams = new URLSearchParams(window.location.search);
      const campus = urlParams.get('campus') || 'v';
  
      return `<a href="course-details.html?code=${encodeURIComponent(courseCode)}&campus=${campus}" 
                class="course-link">${courseCode}</a>`;
    }
  }