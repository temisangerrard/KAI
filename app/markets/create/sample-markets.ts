import { Market } from "@/lib/types/database"

// Sample markets for testing the market discovery components
export const sampleMarkets: Market[] = [
  {
    id: "market_1",
    title: "Will Taylor Swift release a new album this year?",
    description: "Predict whether Taylor Swift will surprise fans with a new album release before the end of the year.",
    category: "Music",
    options: [
      { id: "option_1_1", name: "Yes", percentage: 65, tokens: 6500, color: "bg-kai-600" },
      { id: "option_1_2", name: "No", percentage: 35, tokens: 3500, color: "bg-blue-400" }
    ],
    startDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
    endDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
    status: 'active',
    totalTokens: 25000,
    participants: 450
  },
  {
    id: "market_2",
    title: "Who will win the next season of The Bachelor?",
    description: "Place your predictions on which contestant will receive the final rose in the upcoming season of The Bachelor.",
    category: "TV Shows",
    options: [
      { id: "option_2_1", name: "Contestant #1", percentage: 25, tokens: 2000, color: "bg-kai-600" },
      { id: "option_2_2", name: "Contestant #2", percentage: 40, tokens: 3200, color: "bg-primary-400" },
      { id: "option_2_3", name: "Contestant #3", percentage: 35, tokens: 2800, color: "bg-blue-400" }
    ],
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
    status: 'active',
    totalTokens: 18000,
    participants: 280
  },
  {
    id: "market_3",
    title: "Will Beyoncé announce a world tour?",
    description: "Predict whether Beyoncé will announce a new world tour in the coming months.",
    category: "Music",
    options: [
      { id: "option_3_1", name: "Yes, within 3 months", percentage: 30, tokens: 1800, color: "bg-kai-600" },

      { id: "option_3_2", name: "Yes, but later this year", percentage: 45, tokens: 2700, color: "bg-primary-400" },
      { id: "option_3_3", name: "No announcement this year", percentage: 25, tokens: 1500, color: "bg-blue-400" }
    ],
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    status: 'active',
    totalTokens: 22000,
    participants: 320
  },
  {
    id: "market_4",
    title: "Which fashion trend will dominate next season?",
    description: "Predict the biggest fashion trend for the upcoming season based on runway shows and designer collections.",
    category: "Fashion",
    options: [
      { id: "option_4_1", name: "Y2K Revival", percentage: 40, tokens: 3600, color: "bg-kai-600" },
      { id: "option_4_2", name: "Sustainable Fashion", percentage: 35, tokens: 3150, color: "bg-green-400" },
      { id: "option_4_3", name: "Maximalism", percentage: 25, tokens: 2250, color: "bg-primary-400" }

    ],
    startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
    endDate: new Date(Date.now() + 80 * 24 * 60 * 60 * 1000), // 80 days from now
    status: 'active',
    totalTokens: 9000,
    participants: 178
  },
  {
    id: "market_5",
    title: "Will the next iPhone have a foldable screen?",
    description: "Predict whether Apple will release a foldable iPhone in their next product announcement.",
    category: "Technology",
    options: [
      { id: "option_5_1", name: "Yes", percentage: 20, tokens: 1000, color: "bg-kai-600" },
      { id: "option_5_2", name: "No", percentage: 80, tokens: 4000, color: "bg-blue-400" }
    ],
    startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    endDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000), // 25 days from now
    status: 'active',
    totalTokens: 15500,
    participants: 220
  },
  {
    id: "market_6",
    title: "Which celebrity couple will announce their engagement next?",
    description: "Predict which celebrity couple will be the next to announce their engagement.",
    category: "Celebrity",
    options: [
      { id: "option_6_1", name: "Couple #1", percentage: 30, tokens: 2400, color: "bg-kai-600" },
      { id: "option_6_2", name: "Couple #2", percentage: 45, tokens: 3600, color: "bg-primary-400" },
      { id: "option_6_3", name: "Couple #3", percentage: 25, tokens: 2000, color: "bg-blue-400" }
    ],
    startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
    status: 'active',
    totalTokens: 8000,
    participants: 267
  },
  {
    id: "market_7",
    title: "Which movie will win Best Picture at the next Oscars?",
    description: "Predict which film will take home the Academy Award for Best Picture at the next ceremony.",
    category: "Movies",
    options: [
      { id: "option_7_1", name: "Movie #1", percentage: 20, tokens: 1600, color: "bg-kai-600" },
      { id: "option_7_2", name: "Movie #2", percentage: 35, tokens: 2800, color: "bg-primary-400" },
      { id: "option_7_3", name: "Movie #3", percentage: 30, tokens: 2400, color: "bg-blue-400" },
      { id: "option_7_4", name: "Movie #4", percentage: 15, tokens: 1200, color: "bg-green-400" }
    ],
    startDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
    endDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000), // 120 days from now
    status: 'active',
    totalTokens: 8000,
    participants: 189
  },
  {
    id: "market_8",
    title: "Which social media platform will see the biggest growth?",
    description: "Predict which social media platform will gain the most new users in the next quarter.",
    category: "Social Media",
    options: [
      { id: "option_8_1", name: "TikTok", percentage: 45, tokens: 4500, color: "bg-kai-600" },

      { id: "option_8_2", name: "Instagram", percentage: 30, tokens: 3000, color: "bg-primary-400" },

      { id: "option_8_3", name: "Twitter/X", percentage: 15, tokens: 1500, color: "bg-blue-400" },
      { id: "option_8_4", name: "BeReal", percentage: 10, tokens: 1000, color: "bg-green-400" }
    ],
    startDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
    endDate: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000), // 75 days from now
    status: 'active',
    totalTokens: 28000,
    participants: 520
  }
]