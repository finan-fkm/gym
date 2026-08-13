export const initialClients = [
  {
    id: "therese_spring",
    name: "Therese Spring",
    username: "@thespring",
    location: "Los Angeles, CA",
    clientSince: "2/23/17",
    height: "5'6\"",
    photo: "/images/therese.webp",
    fitnessLevel: "Moderate",
    equipmentPreference: "Bodyweight, Free Weights",
    goals: [
      "Lose Weight",
      "Strengthen",
      "Be able to do 15 pull ups unbroken"
    ],
    metrics: [
      { id: "weight", name: "Weight", current: 147, unit: "lbs", change: -3.0 },
      { id: "chest", name: "Chest", current: 34.5, unit: "in", change: 0.25 },
      { id: "left_arm", name: "Left Arm", current: 25.75, unit: "in", change: 0.0 },
      { id: "right_arm", name: "Right Arm", current: 26.0, unit: "in", change: 0.0 },
      { id: "waist", name: "Waist", current: 54.0, unit: "in", change: -0.5 },
      { id: "hips", name: "Hips", current: 79.25, unit: "in", change: -0.5 },
      { id: "left_thigh", name: "Left Thigh", current: 23.5, unit: "in", change: 0.25 },
      { id: "right_thigh", name: "Right Thigh", current: 23.5, unit: "in", change: 0.0 }
    ],
    nextSession: {
      date: "Tuesday, March 13, 2018",
      time: "3:00 PM",
      location: "Private Studio, West LA"
    },
    weeklyProgress: [
      { id: "mon", dayName: "Monday", dateNum: 12, completed: false, focus: "Cardio & Core" },
      { id: "tue", dayName: "Tuesday", dateNum: 13, completed: true, focus: "Chest & Back" },
      { id: "wed", dayName: "Wednesday", dateNum: 14, completed: true, focus: "Arm Day" },
      { id: "thu", dayName: "Thursday", dateNum: 15, completed: false, focus: "Lower Body" },
      { id: "fri", dayName: "Friday", dateNum: 16, completed: false, focus: "Rest Day" },
      { id: "sat", dayName: "Saturday", dateNum: 17, completed: false, focus: "Recover Yoga" },
      { id: "sun", dayName: "Sunday", dateNum: 18, completed: false, focus: "Rest Day" }
    ],
    dailyWorkouts: {
      thu: {
        name: "Lower Body Burn",
        duration: "30 minutes",
        exercises: [
          {
            id: "ex_1",
            name: "Forward Lunge",
            sets: 4,
            equipment: "Free Weights",
            details: "1: 10/25   2: 10/28   3: 10/30   4: 10/30",
            reps: "10 reps per set",
            weight: "25-30 lbs",
            completed: true,
            image: "/images/exercise_lunge.webp"
          },
          {
            id: "ex_2",
            name: "Leg Press",
            sets: 4,
            equipment: "Leg Press Machine",
            details: "Suggested Weight: 25lbs",
            reps: "10 reps",
            weight: "25 lbs",
            completed: false,
            image: "/images/exercise_legpress.webp"
          },
          {
            id: "ex_3",
            name: "Air Squat",
            sets: 2,
            equipment: "Bodyweight",
            details: "Reps: 20",
            reps: "20 reps",
            weight: "Bodyweight",
            completed: false,
            supersetId: "ss_1",
            image: "/images/exercise_squat.webp"
          },
          {
            id: "ex_4",
            name: "Burpee",
            sets: 2,
            equipment: "Bodyweight",
            details: "Duration: 45 seconds",
            reps: "45s duration",
            weight: "Bodyweight",
            completed: false,
            supersetId: "ss_1",
            image: "/images/exercise_burpee.webp"
          },
          {
            id: "ex_5",
            name: "High Knees",
            sets: 1,
            equipment: "Bodyweight",
            details: "Duration: 45 seconds",
            reps: "45s duration",
            weight: "Bodyweight",
            completed: false,
            image: "/images/exercise_highknees.webp"
          }
        ]
      },
      tue: {
        name: "Chest & Back Power",
        duration: "45 minutes",
        exercises: [
          {
            id: "ex_tue_1",
            name: "Push-ups",
            sets: 3,
            equipment: "Bodyweight",
            details: "Reps: 15",
            reps: "15 reps",
            weight: "Bodyweight",
            completed: true,
            image: "/images/exercise_pushups.webp"
          },
          {
            id: "ex_tue_2",
            name: "Dumbbell Row",
            sets: 3,
            equipment: "Dumbbells",
            details: "Reps: 12, Weight: 20lbs",
            reps: "12 reps",
            weight: "20 lbs",
            completed: true,
            image: "/images/exercise_row.webp"
          }
        ]
      },
      wed: {
        name: "Arm Shredder",
        duration: "30 minutes",
        exercises: [
          {
            id: "ex_wed_1",
            name: "Bicep Curl",
            sets: 3,
            equipment: "Dumbbells",
            details: "Reps: 12, Weight: 15lbs",
            reps: "12 reps",
            weight: "15 lbs",
            completed: true,
            image: "/images/exercise_bicepcurl.webp"
          },
          {
            id: "ex_wed_2",
            name: "Tricep Dips",
            sets: 3,
            equipment: "Bench",
            details: "Reps: 15",
            reps: "15 reps",
            weight: "Bodyweight",
            completed: true,
            image: "/images/exercise_tricepdip.webp"
          }
        ]
      }
    },
    notes: [
      {
        id: "note_1",
        date: "Today",
        timestamp: "Today",
        text: "Therese's form has drastically improved on squats. She is still struggling with pull ups and needs to focus next workout on building strength."
      },
      {
        id: "note_2",
        date: "August 20, 2018",
        timestamp: "Aug 20, 2018",
        text: "Therese's form has drastically improved on squats. She is still struggling with pull ups and need to focus next workout."
      },
      {
        id: "note_3",
        date: "August 15, 2018",
        timestamp: "Aug 15, 2018",
        text: "Therese's form has drastically improved on squats. She is still struggling with pull ups and need to focus next workout."
      }
    ],
    signinHistory: [
      { id: "s_1", date: "03/10/2018", signature: "FIT_BY_SHAHID_" },
      { id: "s_2", date: "03/01/2018", signature: "FIT_BY_SHAHID_" },
      { id: "s_3", date: "03/21/2018", signature: "FIT_BY_SHAHID_" },
      { id: "s_4", date: "02/03/2018", signature: "FIT_BY_SHAHID_" },
      { id: "s_5", date: "01/15/2018", signature: "FIT_BY_SHAHID_" },
      { id: "s_6", date: "01/02/2018", signature: "FIT_BY_SHAHID_" },
      { id: "s_7", date: "01/01/2018", signature: "FIT_BY_SHAHID_" }
    ],
    metricsHistory: [
      { date: "Jan", weight: 152, chest: 35.0, waist: 55.5 },
      { date: "Feb", weight: 149, chest: 34.8, waist: 54.5 },
      { date: "Mar", weight: 147, chest: 34.5, waist: 54.0 }
    ]
  },
  {
    id: "john_doe",
    name: "John Doe",
    username: "@johndoe",
    location: "San Francisco, CA",
    clientSince: "5/12/18",
    height: "6'1\"",
    photo: "/images/john.webp",
    fitnessLevel: "Advanced",
    equipmentPreference: "Barbells, Free Weights, Machines",
    goals: [
      "Build Muscle Mass",
      "Increase Bench Press to 225lbs",
      "Improve cardiovascular endurance"
    ],
    metrics: [
      { id: "weight", name: "Weight", current: 185, unit: "lbs", change: 2.5 },
      { id: "chest", name: "Chest", current: 41.2, unit: "in", change: 0.5 },
      { id: "left_arm", name: "Left Arm", current: 15.2, unit: "in", change: 0.1 },
      { id: "right_arm", name: "Right Arm", current: 15.3, unit: "in", change: 0.15 },
      { id: "waist", name: "Waist", current: 33.0, unit: "in", change: -0.2 },
      { id: "hips", name: "Hips", current: 40.5, unit: "in", change: 0.0 },
      { id: "left_thigh", name: "Left Thigh", current: 24.1, unit: "in", change: 0.3 },
      { id: "right_thigh", name: "Right Thigh", current: 24.0, unit: "in", change: 0.2 }
    ],
    nextSession: {
      date: "Wednesday, March 14, 2018",
      time: "10:00 AM",
      location: "Gold's Gym Downtown"
    },
    weeklyProgress: [
      { id: "mon", dayName: "Monday", dateNum: 12, completed: true, focus: "Upper Body Push" },
      { id: "tue", dayName: "Tuesday", dateNum: 13, completed: false, focus: "Rest Day" },
      { id: "wed", dayName: "Wednesday", dateNum: 14, completed: false, focus: "Legs & Core" },
      { id: "thu", dayName: "Thursday", dateNum: 15, completed: false, focus: "Upper Body Pull" },
      { id: "fri", dayName: "Friday", dateNum: 16, completed: false, focus: "Rest" },
      { id: "sat", dayName: "Saturday", dateNum: 17, completed: false, focus: "HIIT Conditioning" },
      { id: "sun", dayName: "Sunday", dateNum: 18, completed: false, focus: "Rest" }
    ],
    dailyWorkouts: {
      mon: {
        name: "Upper Body Push",
        duration: "45 minutes",
        exercises: [
          {
            id: "ex_j_1",
            name: "Barbell Bench Press",
            sets: 4,
            equipment: "Barbell",
            details: "1: 8/185  2: 8/195  3: 6/205  4: 6/205",
            reps: "8-6 reps",
            weight: "185-205 lbs",
            completed: true,
            image: "/images/exercise_bench.webp"
          }
        ]
      }
    },
    notes: [
      {
        id: "note_j1",
        date: "Yesterday",
        timestamp: "Yesterday",
        text: "John hit a PR on bench press. Form remained solid, need to monitor his left shoulder tightness."
      }
    ],
    signinHistory: [
      { id: "s_j1", date: "03/12/2018", signature: "FIT_BY_SHAHID_" }
    ],
    metricsHistory: [
      { date: "Jan", weight: 180, chest: 40.5, waist: 33.5 },
      { date: "Feb", weight: 183, chest: 40.9, waist: 33.2 },
      { date: "Mar", weight: 185, chest: 41.2, waist: 33.0 }
    ]
  }
];
