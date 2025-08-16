/**
 * Market Templates for KAI platform
 * Provides pre-defined templates for common prediction types
 */

export interface MarketTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  options: {
    name: string;
    color: string;
  }[];
  icon: string; // Lucide icon name
}

// Define market templates
export const marketTemplates: MarketTemplate[] = [
  {
    id: "yes-no",
    name: "Yes/No Prediction",
    description: "A simple yes or no prediction about a future event",
    category: "General",
    options: [
      { name: "Yes", color: "bg-green-400" },
      { name: "No", color: "bg-red-400" }
    ],
    icon: "Check"
  },
  {
    id: "multiple-choice",
    name: "Multiple Choice",
    description: "Choose between multiple possible outcomes",
    category: "General",
    options: [
      { name: "Option 1", color: "bg-kai-600" },
      { name: "Option 2", color: "bg-primary-400" },
      { name: "Option 3", color: "bg-blue-400" }
    ],
    icon: "List"
  },
  {
    id: "celebrity-couple",
    name: "Celebrity Couple",
    description: "Will this celebrity couple stay together?",
    category: "Entertainment",
    options: [
      { name: "They'll stay together", color: "bg-kai-600" },
      { name: "They'll break up", color: "bg-primary-400" }
    ],
    icon: "Heart"
  },
  {
    id: "tv-show-winner",
    name: "TV Show Winner",
    description: "Who will win this TV show or competition?",
    category: "Entertainment",
    options: [
      { name: "Contestant 1", color: "bg-kai-600" },
      { name: "Contestant 2", color: "bg-primary-400" },
      { name: "Contestant 3", color: "bg-blue-400" },
      { name: "Contestant 4", color: "bg-green-400" }
    ],
    icon: "Trophy"
  },
  {
    id: "fashion-trend",
    name: "Fashion Trend",
    description: "Will this fashion trend catch on?",
    category: "Fashion",
    options: [
      { name: "It will be huge", color: "bg-kai-600" },
      { name: "Limited popularity", color: "bg-primary-400" },
      { name: "It will flop", color: "bg-red-400" }
    ],
    icon: "Shirt"
  },
  {
    id: "album-release",
    name: "Album Release",
    description: "When will this artist release their next album?",
    category: "Music",
    options: [
      { name: "Within 3 months", color: "bg-kai-600" },
      { name: "3-6 months", color: "bg-primary-400" },
      { name: "6-12 months", color: "bg-blue-400" },
      { name: "More than a year", color: "bg-green-400" }
    ],
    icon: "Music"
  },
  {
    id: "movie-performance",
    name: "Movie Performance",
    description: "How will this movie perform at the box office?",
    category: "Movies",
    options: [
      { name: "Blockbuster hit", color: "bg-green-400" },
      { name: "Moderate success", color: "bg-blue-400" },
      { name: "Underperformer", color: "bg-orange-400" },
      { name: "Box office flop", color: "bg-red-400" }
    ],
    icon: "Film"
  },
  {
    id: "social-media-milestone",
    name: "Social Media Milestone",
    description: "When will this influencer reach their next follower milestone?",
    category: "Social Media",
    options: [
      { name: "Within a month", color: "bg-kai-600" },
      { name: "1-3 months", color: "bg-primary-400" },
      { name: "3-6 months", color: "bg-blue-400" },
      { name: "More than 6 months", color: "bg-green-400" }
    ],
    icon: "Users"
  },
  {
    id: "award-show-winner",
    name: "Award Show Winner",
    description: "Who will win at the next major award show?",
    category: "Entertainment",
    options: [
      { name: "Nominee 1", color: "bg-kai-600" },
      { name: "Nominee 2", color: "bg-primary-400" },
      { name: "Nominee 3", color: "bg-blue-400" },
      { name: "Dark horse winner", color: "bg-green-400" }
    ],
    icon: "Trophy"
  },
  {
    id: "relationship-status",
    name: "Relationship Status",
    description: "What will happen with this celebrity relationship?",
    category: "Celebrity",
    options: [
      { name: "They'll get engaged", color: "bg-kai-600" },
      { name: "They'll stay together", color: "bg-primary-400" },
      { name: "They'll break up", color: "bg-red-400" }
    ],
    icon: "Heart"
  },
  {
    id: "viral-trend",
    name: "Viral Trend",
    description: "Will this trend go viral on social media?",
    category: "Social Media",
    options: [
      { name: "Massive viral hit", color: "bg-green-400" },
      { name: "Moderate popularity", color: "bg-blue-400" },
      { name: "Limited reach", color: "bg-orange-400" },
      { name: "Won't catch on", color: "bg-red-400" }
    ],
    icon: "Users"
  },
  {
    id: "product-launch",
    name: "Product Launch",
    description: "How will this new product perform in the market?",
    category: "Technology",
    options: [
      { name: "Huge success", color: "bg-green-400" },
      { name: "Moderate success", color: "bg-blue-400" },
      { name: "Disappointing", color: "bg-orange-400" },
      { name: "Complete flop", color: "bg-red-400" }
    ],
    icon: "Sparkles"
  },
  {
    id: "beauty-trend",
    name: "Beauty Trend",
    description: "Will this beauty trend become mainstream?",
    category: "Fashion",
    options: [
      { name: "Next big thing", color: "bg-kai-600" },
      { name: "Niche popularity", color: "bg-primary-400" },
      { name: "Short-lived fad", color: "bg-orange-400" }
    ],
    icon: "Sparkles"
  }
];

/**
 * Get a market template by ID
 * @param templateId Template ID
 * @returns Market template or undefined if not found
 */
export const getTemplateById = (templateId: string): MarketTemplate | undefined => {
  return marketTemplates.find(template => template.id === templateId);
};

/**
 * Get market templates by category
 * @param category Category to filter by
 * @returns Array of market templates in the specified category
 */
export const getTemplatesByCategory = (category: string): MarketTemplate[] => {
  return marketTemplates.filter(template => template.category === category);
};