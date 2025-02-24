import pandas as pd
import glob
import os
import json

# Paths
root_folder = "course-data/pre-processed"
output_root = "course-data/post-processed"
ubcv_folder = os.path.join(root_folder, "UBCV")
ubco_folder = os.path.join(root_folder, "UBCO")

# Load faculty data for both Vancouver and Okanagan campuses
with open("course-data/subjects-prereqs/UBCV-subjects.json") as f:
    vancouver_subjects = json.load(f)

with open("course-data/subjects-prereqs/UBCO-subjects.json") as f:
    okanagan_subjects = json.load(f)

# Grade ranges for distribution
grade_ranges = ['<50', '50-54', '55-59', '60-63', '64-67', '68-71', '72-75', '76-79', '80-84', '85-89', '90-100']

# Process each campus
for campus_folder, subjects, output_campus_folder in [
    (ubcv_folder, vancouver_subjects, os.path.join(output_root, "UBCV")),
    (ubco_folder, okanagan_subjects, os.path.join(output_root, "UBCO"))
]:
    term_folders = [f.path for f in os.scandir(campus_folder) if f.is_dir()]
    
    # Ensure the output directory exists
    os.makedirs(output_campus_folder, exist_ok=True)

    for term_folder in term_folders:
        term_name = os.path.basename(term_folder)
        output_file = os.path.join(output_campus_folder, f"{term_name}.json")
        
        all_courses = []
        csv_files = glob.glob(f"{term_folder}/*.csv")
        data = []

        for file in csv_files:
            # Read the CSV data
            df = pd.read_csv(file)
            df.columns = df.columns.str.strip()

            # Initialize missing columns
            for col in ['Reported', 'Avg', 'Median', 'Percentile (25)', 'Percentile (75)', 'High', 'Low'] + grade_ranges:
                if col not in df.columns:
                    df[col] = 0

            # Fill NaN values
            for col in ['Reported', 'Avg', 'Median', 'Percentile (25)', 'Percentile (75)', 'High', 'Low'] + grade_ranges:
                df[col] = df[col].fillna(0)

            data.append(df)

        if not data:
            continue

        df_all = pd.concat(data, ignore_index=True)

        # Print some sample data to verify decimals
        print("\nSample of original data:")
        print(df_all[['Subject', 'Course', 'Median']].head())

        # Calculate weighted values for each course
        df_all['WeightedGrade'] = df_all['Avg'] * df_all['Reported']
        df_all['WeightedMedian'] = df_all['Median'] * df_all['Reported']
        df_all['WeightedP25'] = df_all['Percentile (25)'] * df_all['Reported']
        df_all['WeightedP75'] = df_all['Percentile (75)'] * df_all['Reported']

        # Group by Subject and Course
        final_grouped = df_all.groupby(['Subject', 'Course'], as_index=False).agg(
            title=('Title', 'first'),
            professors=('Professor', lambda x: list(x.dropna().unique())),
            reported=('Reported', 'sum'),
            weighted_sum=('WeightedGrade', 'sum'),
            weighted_median_sum=('WeightedMedian', 'sum'),
            weighted_p25_sum=('WeightedP25', 'sum'),
            weighted_p75_sum=('WeightedP75', 'sum'),
            high=('High', 'max'),
            low=('Low', 'min'),
            **{range_: (range_, 'sum') for range_ in grade_ranges}
        )

        # Calculate weighted statistics with full precision
        final_grouped['avg'] = final_grouped['weighted_sum'] / final_grouped['reported']
        final_grouped['weighted_median'] = final_grouped['weighted_median_sum'] / final_grouped['reported']
        final_grouped['weighted_p25'] = final_grouped['weighted_p25_sum'] / final_grouped['reported']
        final_grouped['weighted_p75'] = final_grouped['weighted_p75_sum'] / final_grouped['reported']

        # Print sample of calculated data
        print("\nSample of calculated weighted medians:")
        print(final_grouped[['Subject', 'Course', 'weighted_median']].head())

        # Add faculty and campus data
        for idx, row in final_grouped.iterrows():
            subject_code = row['Subject']
            subject_info = next((item for item in subjects if item["code"] == subject_code), None)
            
            if subject_info:
                faculty = subject_info["faculty_school"]

                course_data = {
                    "Subject": subject_info["title"],
                    "Code": f"{row['Subject']} {row['Course']}",
                    "Name": row['title'],
                    "Faculty": faculty,
                    "Average": round(row['avg'], 2),
                    "Reported": int(row['reported']),
                    "WeightedMedian": round(row['weighted_median'], 2),  # Maintaining 2 decimal places
                    "Percentile25": round(row['weighted_p25'], 2),
                    "Percentile75": round(row['weighted_p75'], 2),
                    "High": int(row['high']),
                    "Low": int(row['low']),
                    **{range_: int(row[range_]) for range_ in grade_ranges},
                    "Professors": row['professors']
                }

                all_courses.append(course_data)

        # Save the results
        with open(output_file, 'w') as f:
            json.dump(all_courses, f, indent=4)

print("Data processed and saved successfully.")