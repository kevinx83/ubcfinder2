export class ProfessorsManager {
    constructor() {
        this.professorsContent = document.getElementById('professorsContent');
        this.instructorData = null;
    }

    async update(professors, courseCode) {
        if (!professors || professors.length === 0) {
            this.professorsContent.innerHTML = '<p>No professor information available</p>';
            return;
        }

        try {
            // Get current campus and session from URL
            const urlParams = new URLSearchParams(window.location.search);
            const campus = urlParams.get('campus') || 'v';
            const session = document.getElementById('sessionSelect')?.value || '2023W';
            
            const campusName = campus.toLowerCase() === 'v' ? 'UBCV' : 'UBCO';
            const response = await fetch(`/instructor-data/${campusName}/${session}.json`);
            const instructorData = await response.json();
            this.instructorData = instructorData;

            // Find all professors who teach this course
            const courseProfessors = [];
            for (const instructor of instructorData) {
                // Look for this course in the instructor's courses
                const courseEntry = instructor.courses.find(course => course.code === courseCode);
                if (courseEntry) {
                    courseProfessors.push({
                        name: instructor.name,
                        courseData: courseEntry
                    });
                }
            }

            // Create table structure directly without wrapper or show more button
            const tableHtml = `
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Instructor</th>
                                <th>Grades</th>
                                <th>Avg</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${courseProfessors.map(prof => {
                                const avgClass = this.getAverageClass(prof.courseData.average);
                                const searchUrl = `https://www.ratemyprofessors.com/search/professors?q=${encodeURIComponent(prof.name)}`;
                                
                                return `
                                    <tr>
                                        <td>
                                            <a href="${searchUrl}" 
                                               class="course-link" 
                                               target="_blank" 
                                               rel="noopener noreferrer">${prof.name}</a>
                                        </td>
                                        <td>
                                            <button class="view-grades-btn" 
                                                    data-professor="${prof.name}"
                                                    data-course="${courseCode}">View</button>
                                        </td>
                                        <td class="${avgClass} monospace">
                                            ${prof.courseData.average.toFixed(2)}
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `;

            this.professorsContent.innerHTML = tableHtml;

            // Add event listeners for view grades buttons
            const viewGradesButtons = this.professorsContent.querySelectorAll('.view-grades-btn');
            viewGradesButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    const profName = e.target.dataset.professor;
                    const courseCode = e.target.dataset.course;
                    this.showProfessorGrades(profName, courseCode);
                });
            });

        } catch (error) {
            console.error('Error loading instructor data:', error);
            this.professorsContent.innerHTML = '<p>Error loading professor information</p>';
        }
    }

    showProfessorGrades(profName, courseCode) {
        const prof = this.instructorData.find(p => p.name === profName);
        const courseData = prof?.courses.find(c => c.code === courseCode);
        
        if (courseData) {
            const gradeDistribution = {
                Average: courseData.average,
                Reported: courseData.reported,
                WeightedMedian: courseData.median,
                High: courseData.high,
                Low: courseData.low,
                '<50': courseData['<50'] || 0,
                '50-54': courseData['50-54'] || 0,
                '55-59': courseData['55-59'] || 0,
                '60-63': courseData['60-63'] || 0,
                '64-67': courseData['64-67'] || 0,
                '68-71': courseData['68-71'] || 0,
                '72-75': courseData['72-75'] || 0,
                '76-79': courseData['76-79'] || 0,
                '80-84': courseData['80-84'] || 0,
                '85-89': courseData['85-89'] || 0,
                '90-100': courseData['90-100'] || 0
            };

            const gradesManager = window.app?.gradesManager;
            if (gradesManager) {
                gradesManager.update(gradeDistribution, profName);
            }
        }
    }

    getAverageClass(average) {
        if (!average) return '';
        if (average >= 90) return 'excellent-average';
        if (average >= 85) return 'great-average';
        if (average >= 80) return 'good-average';
        if (average >= 70) return 'fair-average';
        if (average >= 60) return 'bad-average';
        return 'horrible-average';
    }
}