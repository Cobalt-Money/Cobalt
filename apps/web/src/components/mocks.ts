import { COLORS } from "@/components/constants";
import type { IEvent, IUser } from "@/components/interfaces";

export const USERS_MOCK: IUser[] = [
  {
    id: "f3b035ac-49f7-4e92-a715-35680bf63175",
    name: "Michael Doe",
    picturePath: null,
  },
  {
    id: "3e36ea6e-78f3-40dd-ab8c-a6c737c3c422",
    name: "Alice Johnson",
    picturePath: null,
  },
  {
    id: "a7aff6bd-a50a-4d6a-ab57-76f76bb27cf5",
    name: "Robert Smith",
    picturePath: null,
  },
  {
    id: "dd503cf9-6c38-43cf-94cc-0d4032e2f77a",
    name: "Emily Davis",
    picturePath: null,
  },
];

// ================================== //

const events = [
  "Doctor's appointment",
  "Dental cleaning",
  "Eye exam",
  "Therapy session",
  "Business meeting",
  "Team stand-up",
  "Project deadline",
  "Weekly report submission",
  "Client presentation",
  "Marketing strategy review",
  "Networking event",
  "Sales call",
  "Investor pitch",
  "Board meeting",
  "Employee training",
  "Performance review",
  "One-on-one meeting",
  "Lunch with a colleague",
  "HR interview",
  "Conference call",
  "Web development sprint planning",
  "Software deployment",
  "Code review",
  "QA testing session",
  "Cybersecurity audit",
  "Server maintenance",
  "API integration update",
  "Data backup",
  "Cloud migration",
  "System upgrade",
  "Content planning session",
  "Product launch",
  "Customer support review",
  "Team building activity",
  "Legal consultation",
  "Budget review",
  "Financial planning session",
  "Tax filing deadline",
  "Investor relations update",
  "Partnership negotiation",
  "Medical check-up",
  "Vaccination appointment",
  "Blood donation",
  "Gym workout",
  "Yoga class",
  "Physical therapy session",
  "Nutrition consultation",
  "Personal trainer session",
  "Parent-teacher meeting",
  "School open house",
  "College application deadline",
  "Final exam",
  "Graduation ceremony",
  "Job interview",
  "Internship orientation",
  "Office relocation",
  "Business trip",
  "Flight departure",
  "Hotel check-in",
  "Vacation planning",
  "Birthday party",
  "Wedding anniversary",
  "Family reunion",
  "Housewarming party",
  "Community volunteer work",
  "Charity fundraiser",
  "Religious service",
  "Concert attendance",
  "Theater play",
  "Movie night",
  "Sporting event",
  "Football match",
  "Basketball game",
  "Tennis practice",
  "Marathon training",
  "Cycling event",
  "Fishing trip",
  "Camping weekend",
  "Hiking expedition",
  "Photography session",
  "Art workshop",
  "Cooking class",
  "Book club meeting",
  "Grocery shopping",
  "Car maintenance",
  "Home renovation meeting",
];

const mockGenerator = (numberOfEvents: number): IEvent[] => {
  const result: IEvent[] = [];
  let currentId = 1;

  const randomUser = USERS_MOCK[Math.floor(Math.random() * USERS_MOCK.length)];

  // Date range: 30 days before and after now
  const now = new Date();
  const startRange = new Date(now);
  startRange.setDate(now.getDate() - 30);
  const endRange = new Date(now);
  endRange.setDate(now.getDate() + 30);

  // Create an event happening now
  const currentEvent = {
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    endDate: new Date(now.getTime() + 30 * 60_000).toISOString(),
    id: currentId,
    startDate: new Date(now.getTime() - 30 * 60_000).toISOString(),
    title: events[Math.floor(Math.random() * events.length)],
    user: randomUser,
  };
  currentId += 1;

  result.push(currentEvent);

  // Generate the remaining events
  for (let i = 0; i < numberOfEvents - 1; i += 1) {
    // Determine if this is a multi-day event (10% chance)
    const isMultiDay = Math.random() < 0.1;

    const startDate = new Date(
      startRange.getTime() +
        Math.random() * (endRange.getTime() - startRange.getTime())
    );

    // Set time between 8 AM and 8 PM
    startDate.setHours(
      8 + Math.floor(Math.random() * 12),
      Math.floor(Math.random() * 60),
      0,
      0
    );

    const endDate = new Date(startDate);

    if (isMultiDay) {
      // Multi-day event: Add 1-4 days
      const additionalDays = Math.floor(Math.random() * 4) + 1;
      endDate.setDate(startDate.getDate() + additionalDays);
      endDate.setHours(
        8 + Math.floor(Math.random() * 12),
        Math.floor(Math.random() * 60),
        0,
        0
      );
    } else {
      // Same-day event: Add 1-3 hours
      endDate.setHours(endDate.getHours() + Math.floor(Math.random() * 3) + 1);
    }

    const nextId = currentId;
    currentId += 1;
    result.push({
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      description:
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
      endDate: endDate.toISOString(),
      id: nextId,
      startDate: startDate.toISOString(),
      title: events[Math.floor(Math.random() * events.length)],
      user: USERS_MOCK[Math.floor(Math.random() * USERS_MOCK.length)],
    });
  }

  return result;
};

export const CALENDAR_ITEMS_MOCK: IEvent[] = mockGenerator(80);
