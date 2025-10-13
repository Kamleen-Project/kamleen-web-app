import { PrismaClient } from "../src/generated/prisma/index.js"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

function slugify(input) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

const hosts = [
  {
    email: "amara.rivera@together.dev",
    name: "Amara Rivera",
    headline: "Chef & cultural storyteller",
    bio: "I host intimate culinary journeys that celebrate Afro-Caribbean flavors, shared on a historic brownstone rooftop overlooking the city skyline.",
    location: "Brooklyn, USA",
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80",
    website: "https://amaraeats.co",
    experiences: [
      {
        title: "Rooftop Heritage Supper Club",
        summary: "Six-course tasting menu that traces the diaspora through bold spices, live percussion, and communal storytelling.",
        description:
          "Gather under the string lights for a seasonal tasting menu that blends Amara's Dominican roots with contemporary New York techniques. Each course is paired with farm-sourced mocktails, and live percussionists guide intentional conversation between courses.",
        location: "Brooklyn, New York",
        duration: "3 hours",
        price: 165,
        currency: "USD",
        heroImage: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=80",
        category: "culinary",
        tags: ["culinary", "music", "rooftop"],
        averageRating: 4.92,
        reviewCount: 184,
        galleryImages: [
          "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1600&q=80",
          "https://images.unsplash.com/photo-1520201163981-8cc95007dd2a?auto=format&fit=crop&w=1600&q=80",
          "https://images.unsplash.com/photo-1498654896293-37aacf113fd9?auto=format&fit=crop&w=1600&q=80",
          "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1600&q=80",
          "https://images.unsplash.com/photo-1543968996-ee822b8176ba?auto=format&fit=crop&w=1600&q=80",
        ],
        meeting: {
          address: "145 Greene Ave",
          city: "Brooklyn",
          country: "United States",
          latitude: 40.6894,
          longitude: -73.9483,
        },
        itinerary: [
          {
            title: "Golden hour welcome toast",
            subtitle: "Sorrel spritzers, skyline storytelling, and introductions around the fire pit.",
            image: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1600&q=80",
          },
          {
            title: "Hands-on spice workshop",
            subtitle: "Blend signature rubs and learn the origin of each ingredient with Amara.",
            image: "https://images.unsplash.com/photo-1520201163981-8cc95007dd2a?auto=format&fit=crop&w=1600&q=80",
          },
          {
            title: "Six-course tasting & live percussion",
            subtitle: "Communal shared plates, guava-glazed plantains, and a live percussion interlude.",
            image: "https://images.unsplash.com/photo-1498654896293-37aacf113fd9?auto=format&fit=crop&w=1600&q=80",
          },
        ],
        sessions: [
          { inDays: 10, hour: 19, durationHours: 3, capacity: 16, priceOverride: null },
          { inDays: 24, hour: 19, durationHours: 3, capacity: 16, priceOverride: 175 },
        ],
      },
      {
        title: "Sunrise Mercado Tour & Brunch Lab",
        summary: "Explore hidden markets at dawn, then co-create a vibrant brunch featuring small-batch Caribbean growers.",
        description:
          "We'll begin with a guided mercado walk to source the freshest produce, then return to the kitchen studio to co-create a three-course brunch. Expect knife-skill micro workshops, spice pairings, and a focus on zero-waste techniques.",
        location: "Lower East Side, New York",
        duration: "4 hours",
        price: 135,
        currency: "USD",
        heroImage: "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=1600&q=80",
        category: "culinary",
        tags: ["culinary", "market", "hands-on"],
        averageRating: 4.85,
        reviewCount: 96,
        galleryImages: [
          "https://images.unsplash.com/photo-1498654200943-1088dd4438ae?auto=format&fit=crop&w=1600&q=80",
          "https://images.unsplash.com/photo-1532635247-241fc64b9eaa?auto=format&fit=crop&w=1600&q=80",
          "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&w=1600&q=80",
          "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1600&q=80",
          "https://images.unsplash.com/photo-1481930685571-a6877c4d1c00?auto=format&fit=crop&w=1600&q=80",
        ],
        meeting: {
          address: "88 Essex St",
          city: "New York",
          country: "United States",
          latitude: 40.7181,
          longitude: -73.9881,
        },
        itinerary: [
          {
            title: "Dawn mercado scouting",
            subtitle: "Meet vendors before opening hours and taste the brightest seasonal produce.",
            image: "https://images.unsplash.com/photo-1498654200943-1088dd4438ae?auto=format&fit=crop&w=1600&q=80",
          },
          {
            title: "Spice pairing lab",
            subtitle: "Build flavor maps and experiment with citrus, herbs, and Caribbean aromatics.",
            image: "https://images.unsplash.com/photo-1532635247-241fc64b9eaa?auto=format&fit=crop&w=1600&q=80",
          },
          {
            title: "Brunch co-creation studio",
            subtitle: "Cook side-by-side in the loft kitchen and plate a three-course brunch spread.",
            image: "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&w=1600&q=80",
          },
        ],
        sessions: [
          { inDays: 7, hour: 8, durationHours: 4, capacity: 10, priceOverride: null },
          { inDays: 21, hour: 8, durationHours: 4, capacity: 10, priceOverride: null },
        ],
      },
    ],
  },
  {
    email: "li.wei@together.dev",
    name: "Li Wei",
    headline: "Ceramicist & tea ceremony guide",
    bio: "I craft mindful tea experiences and wheel-throwing residencies inside a tranquil courtyard studio that has been in my family for generations.",
    location: "Hangzhou, China",
    image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80",
    website: "https://liweinotes.studio",
    experiences: [
      {
        title: "Moonlit Tea and Porcelain Firing",
        summary: "Throw your own gaiwan, glaze under the stars, and share ceremonial teas with incense and guqin accompaniment.",
        description:
          "Li Wei guides you through crafting a porcelain tea vessel, then leads a moonlit tea ceremony featuring rare oolongs. You'll leave with your kiln-fired gaiwan and a renewed sense of stillness.",
        location: "Hangzhou, Zhejiang",
        duration: "5 hours",
        price: 220,
        currency: "CNY",
        heroImage: "https://images.unsplash.com/photo-1498557850523-fd3d118b962e?auto=format&fit=crop&w=1600&q=80",
        category: "wellness",
        tags: ["wellness", "craft", "tea"],
        averageRating: 4.97,
        reviewCount: 142,
        galleryImages: [
          "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=1600&q=80",
          "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1600&q=80",
          "https://images.unsplash.com/photo-1502904550040-7534597429ae?auto=format&fit=crop&w=1600&q=80",
          "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80",
          "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1600&q=80",
        ],
        meeting: {
          address: "18 Longjing Rd",
          city: "Hangzhou",
          country: "China",
          latitude: 30.2228,
          longitude: 120.1409,
        },
        itinerary: [
          {
            title: "Courtyard tea welcome",
            subtitle: "Sip floral oolongs while Li Wei introduces the evening ritual.",
            image: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=1600&q=80",
          },
          {
            title: "Wheel-throwing session",
            subtitle: "Shape a personal gaiwan under lantern light and prepare it for glazing.",
            image: "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1600&q=80",
          },
          {
            title: "Moonlit ceremony & kiln firing",
            subtitle: "Share incense, guqin melodies, and fire your vessel before a closing tasting.",
            image: "https://images.unsplash.com/photo-1502904550040-7534597429ae?auto=format&fit=crop&w=1600&q=80",
          },
        ],
        sessions: [
          { inDays: 12, hour: 18, durationHours: 5, capacity: 12, priceOverride: null },
          { inDays: 28, hour: 18, durationHours: 5, capacity: 12, priceOverride: 240 },
        ],
      },
      {
        title: "Clay Retreat: Three-Day Wheel Residency",
        summary: "Slow-design residency with guided meditation, bespoke glazes, and communal vegetarian feasts by the fire.",
        description:
          "Across three evenings you'll deepen wheel technique, experiment with ash glazes, and co-create a communal table of vegetarian dishes sourced from our garden. Includes materials, firing, and overnight tatami accommodation.",
        location: "Hangzhou, Zhejiang",
        duration: "3 days",
        price: 540,
        currency: "CNY",
        heroImage: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1600&q=80",
        category: "creative",
        tags: ["craft", "retreat", "multi-day"],
        averageRating: 4.9,
        reviewCount: 61,
        galleryImages: [
          "https://images.unsplash.com/photo-1468808142770-4193c9a427b0?auto=format&fit=crop&w=1600&q=80",
          "https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?auto=format&fit=crop&w=1600&q=80",
          "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1600&q=80",
          "https://images.unsplash.com/photo-1500530855697-0e26a523831d?auto=format&fit=crop&w=1600&q=80",
          "https://images.unsplash.com/photo-1470010762743-1fa2363f65ca?auto=format&fit=crop&w=1600&q=80",
        ],
        meeting: {
          address: "8 Hupao Rd",
          city: "Hangzhou",
          country: "China",
          latitude: 30.1985,
          longitude: 120.1174,
        },
        itinerary: [
          {
            title: "Arrival tea meditation",
            subtitle: "Ground into the residency with breathwork and guided tasting in the tatami hall.",
            image: "https://images.unsplash.com/photo-1468808142770-4193c9a427b0?auto=format&fit=crop&w=1600&q=80",
          },
          {
            title: "Studio immersion",
            subtitle: "Work through clay bodies, slip techniques, and bespoke glaze experiments.",
            image: "https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?auto=format&fit=crop&w=1600&q=80",
          },
          {
            title: "Evening communal feast",
            subtitle: "Prepare vegetarian dishes together and journal beside the kiln's warm glow.",
            image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1600&q=80",
          },
        ],
        sessions: [
          { inDays: 30, hour: 15, durationHours: 72, capacity: 8, priceOverride: 580 },
          { inDays: 60, hour: 15, durationHours: 72, capacity: 8, priceOverride: 580 },
        ],
      },
    ],
  },
  {
    email: "sebastien.laurent@together.dev",
    name: "Sébastien Laurent",
    headline: "Adventure curator & eco-guide",
    bio: "I lead immersive alpine journeys focused on slow travel, glacier preservation, and locally crafted cuisine in the French Alps.",
    location: "Chamonix, France",
    image: "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=800&q=80",
    website: "https://alpineatelier.fr",
    experiences: [
      {
        title: "Aurora Glacier Traverse",
        summary: "Snowshoe across a private glacier route, dine in a glass igloo, and hear stories from a local glaciologist.",
        description:
          "We meet at blue hour for safety briefing, then ascend via private gondola. After the traverse, warm up with a chef-prepared fondue in a glass igloo while a glaciologist shares living archive footage.",
        location: "Chamonix-Mont-Blanc, France",
        duration: "8 hours",
        price: 295,
        currency: "EUR",
        heroImage: "https://images.unsplash.com/photo-1517824305544-b6318e01526b?auto=format&fit=crop&w=1600&q=80",
        category: "adventure",
        tags: ["adventure", "alpine", "science"],
        averageRating: 4.88,
        reviewCount: 203,
        galleryImages: [
          "https://images.unsplash.com/photo-1549887534-1541e9326642?auto=format&fit=crop&w=1600&q=80",
          "https://images.unsplash.com/photo-1523419409543-0c1df022bdd2?auto=format&fit=crop&w=1600&q=80",
          "https://images.unsplash.com/photo-1542728928-1413d1894ed1?auto=format&fit=crop&w=1600&q=80",
          "https://images.unsplash.com/photo-1529946825183-136cf1ece0cd?auto=format&fit=crop&w=1600&q=80",
          "https://images.unsplash.com/photo-1523413651479-597eb2da0ad6?auto=format&fit=crop&w=1600&q=80",
        ],
        meeting: {
          address: "35 Route des Pèlerins",
          city: "Chamonix",
          country: "France",
          latitude: 45.9237,
          longitude: 6.8694,
        },
        itinerary: [
          {
            title: "Blue hour safety huddle",
            subtitle: "Gear up, review avalanche reports, and load the private gondola.",
            image: "https://images.unsplash.com/photo-1549887534-1541e9326642?auto=format&fit=crop&w=1600&q=80",
          },
          {
            title: "Glacier traverse",
            subtitle: "Snowshoe alongside the guide while learning about glacial preservation.",
            image: "https://images.unsplash.com/photo-1523419409543-0c1df022bdd2?auto=format&fit=crop&w=1600&q=80",
          },
          {
            title: "Glass igloo fondue",
            subtitle: "Warm up with alpine fondue as the resident glaciologist shares archive footage.",
            image: "https://images.unsplash.com/photo-1529946825183-136cf1ece0cd?auto=format&fit=crop&w=1600&q=80",
          },
        ],
        sessions: [
          { inDays: 14, hour: 17, durationHours: 8, capacity: 12, priceOverride: null },
          { inDays: 35, hour: 17, durationHours: 8, capacity: 12, priceOverride: null },
        ],
      },
      {
        title: "Forager's Raclette & Ridge Camp",
        summary: "Harvest alpine botanicals, learn ridge-camp skills, and share a slow-fire raclette under constellation maps.",
        description:
          "This overnight micro-expedition blends guided foraging with ridge-camp mastery. We'll forage alpine herbs, build a sustainable shelter, and gather around a raclette feast paired with biodynamic wines.",
        location: "Aiguilles Rouges, France",
        duration: "2 days",
        price: 410,
        currency: "EUR",
        heroImage: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80",
        category: "adventure",
        tags: ["adventure", "foraging", "camp"],
        averageRating: 4.93,
        reviewCount: 118,
        galleryImages: [
          "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1600&q=80",
          "https://images.unsplash.com/photo-1512391464763-07803d8f4ee0?auto=format&fit=crop&w=1600&q=80",
          "https://images.unsplash.com/photo-1500530855697-0e26a523831d?auto=format&fit=crop&w=1600&q=80",
          "https://images.unsplash.com/photo-1523417057111-1d5325f0a2f0?auto=format&fit=crop&w=1600&q=80",
          "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80",
        ],
        meeting: {
          address: "Route des Tines",
          city: "Chamonix",
          country: "France",
          latitude: 45.9502,
          longitude: 6.9076,
        },
        itinerary: [
          {
            title: "Forest forage orientation",
            subtitle: "Gather alpine herbs and learn plant identification with Sébastien.",
            image: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1600&q=80",
          },
          {
            title: "Ridge camp setup",
            subtitle: "Pitch eco-forward tents and map the night sky under constellation guides.",
            image: "https://images.unsplash.com/photo-1512391464763-07803d8f4ee0?auto=format&fit=crop&w=1600&q=80",
          },
          {
            title: "Slow-fire raclette feast",
            subtitle: "Share biodynamic wines, stories, and melt raclette over glowing embers.",
            image: "https://images.unsplash.com/photo-1500530855697-0e26a523831d?auto=format&fit=crop&w=1600&q=80",
          },
        ],
        sessions: [
          { inDays: 18, hour: 10, durationHours: 36, capacity: 10, priceOverride: 430 },
          { inDays: 48, hour: 10, durationHours: 36, capacity: 10, priceOverride: 430 },
        ],
      },
    ],
  },
  {
    email: "organizer.demo@together.dev",
    name: "Demo Organizer",
    headline: "Curator of sensory experiences",
    bio: "I host modern city adventures that blend food, art and mindfulness.",
    location: "Brooklyn, USA",
    image: "https://images.unsplash.com/photo-1544006659-f0b21884ce1d?auto=format&fit=crop&w=800&q=80",
    website: "https://demo.organizer.local",
    experiences: [
      {
        title: "Rooftop Yoga & Sunrise Bites",
        summary: "Gentle flow as the sun rises, followed by seasonal small bites and tea.",
        description:
          "We greet the day with a grounding rooftop practice, then share seasonal bites and jasmine tea while the skyline wakes up.",
        location: "Williamsburg, New York",
        duration: "1.5 hours",
        price: 39,
        currency: "USD",
        heroImage: "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1600&q=80",
        category: "wellness",
        tags: ["wellness", "yoga", "sunrise"],
        averageRating: 4.8,
        reviewCount: 32,
        galleryImages: [
          "https://images.unsplash.com/photo-1518609571773-39b7d303a82f?auto=format&fit=crop&w=1600&q=80",
          "https://images.unsplash.com/photo-1516822003754-cca485356ecb?auto=format&fit=crop&w=1600&q=80",
        ],
        meeting: {
          address: "120 Kent Ave",
          city: "Brooklyn",
          country: "United States",
          latitude: 40.7209,
          longitude: -73.9613,
        },
        itinerary: [
          { title: "Sunrise grounding", subtitle: "Breathwork and gentle warm-up.", image: "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1600&q=80" },
          { title: "Guided flow", subtitle: "45-minute slow flow with options.", image: "https://images.unsplash.com/photo-1516822003754-cca485356ecb?auto=format&fit=crop&w=1600&q=80" },
        ],
        sessions: [
          { inDays: 5, hour: 6, durationHours: 1.5, capacity: 18, priceOverride: null },
          { inDays: 12, hour: 6, durationHours: 1.5, capacity: 18, priceOverride: null },
        ],
      },
      {
        title: "Street Food Photo Walk",
        summary: "Capture the best carts and colors while tasting iconic bites.",
        description:
          "A guided walk through hidden alleys and bustling markets. Learn framing tips and taste the city's most-loved snacks.",
        location: "Lower East Side, New York",
        duration: "2 hours",
        price: 55,
        currency: "USD",
        heroImage: "https://images.unsplash.com/photo-1498654200943-1088dd4438ae?auto=format&fit=crop&w=1600&q=80",
        category: "creative",
        tags: ["photography", "street food", "walk"],
        averageRating: 4.7,
        reviewCount: 21,
        galleryImages: [
          "https://images.unsplash.com/photo-1498654896293-37aacf113fd9?auto=format&fit=crop&w=1600&q=80",
          "https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?auto=format&fit=crop&w=1600&q=80",
        ],
        meeting: {
          address: "88 Essex St",
          city: "New York",
          country: "United States",
          latitude: 40.7181,
          longitude: -73.9881,
        },
        itinerary: [
          { title: "Framing & light", subtitle: "Quick composition primer.", image: "https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?auto=format&fit=crop&w=1600&q=80" },
          { title: "Market walk & tasting", subtitle: "Icons and hidden carts.", image: "https://images.unsplash.com/photo-1498654200943-1088dd4438ae?auto=format&fit=crop&w=1600&q=80" },
        ],
        sessions: [
          { inDays: 3, hour: 15, durationHours: 2, capacity: 12, priceOverride: null },
          { inDays: 10, hour: 15, durationHours: 2, capacity: 12, priceOverride: null },
        ],
      },
    ],
  },
]

const explorers = [
  {
    email: "ella.martinez@together.dev",
    name: "Ella Martinez",
    image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80",
    location: "Austin, USA",
  },
  {
    email: "sami.iyengar@together.dev",
    name: "Sami Iyengar",
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=400&q=80",
    location: "London, UK",
  },
  {
    email: "noor.almasri@together.dev",
    name: "Noor Almasri",
    image: "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=400&q=80",
    location: "Dubai, UAE",
  },
  {
    email: "tomoko.kawai@together.dev",
    name: "Tomoko Kawai",
    image: "https://images.unsplash.com/photo-1544723795-43253775f2c9?auto=format&fit=crop&w=400&q=80",
    location: "Kyoto, Japan",
  },
  {
    email: "liam.okafor@together.dev",
    name: "Liam Okafor",
    image: "https://images.unsplash.com/photo-1544723795-3fb364642b4b?auto=format&fit=crop&w=400&q=80",
    location: "Accra, Ghana",
  },
  {
    email: "charlotte.ives@together.dev",
    name: "Charlotte Ives",
    image: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=400&q=80",
    location: "Seattle, USA",
  },
  {
    email: "mateo.silva@together.dev",
    name: "Mateo Silva",
    image: "https://images.unsplash.com/photo-1544723795-3fb764c94737?auto=format&fit=crop&w=400&q=80",
    location: "Lisbon, Portugal",
  },
  {
    email: "jin.park@together.dev",
    name: "Jin Park",
    image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e2?auto=format&fit=crop&w=400&q=80",
    location: "Seoul, South Korea",
  },
]

const reviewTemplates = [
  {
    rating: 5,
    comment:
      "Absolutely unforgettable. Every detail felt intentional and the host created such a warm community vibe.",
  },
  {
    rating: 4,
    comment: "Loved the pacing and storytelling throughout the experience. I learned so much and left inspired.",
  },
  {
    rating: 5,
    comment: "The food, the music, the people—this was magic. Already planning to bring friends next time!",
  },
  {
    rating: 4,
    comment: "Incredible craftsmanship and guidance. I’m still thinking about the textures and flavors days later.",
  },
  {
    rating: 5,
    comment: "The host went above and beyond to make sure everyone felt seen. Highly recommend this experience.",
  },
  {
    rating: 5,
    comment:
      "I can’t believe how much we created in just a few hours. The ambience was relaxing and energizing all at once.",
  },
  {
    rating: 4,
    comment: "A beautiful blend of storytelling and hands-on activity. Left with new skills and new friends.",
  },
  {
    rating: 5,
    comment: "One of the best things I’ve done in the city. Thoughtful touches from start to finish.",
  },
]

function formatDurationLabel(totalHours) {
  const hours = Math.floor(totalHours)
  const minutes = Math.round((totalHours - hours) * 60)
  const days = Math.floor(hours / 24)
  const remHours = hours % 24
  const parts = []
  if (days) parts.push(`${days} day${days === 1 ? '' : 's'}`)
  if (remHours) parts.push(`${remHours} hour${remHours === 1 ? '' : 's'}`)
  if (minutes) parts.push(`${minutes} min`)
  if (!parts.length) parts.push('0 min')
  return parts.join(' ')
}

function buildSession({ inDays, hour, durationHours, capacity, priceOverride }) {
  const start = new Date()
  start.setDate(start.getDate() + inDays)
  start.setHours(hour, 0, 0, 0)
  return {
    startAt: start,
    duration: formatDurationLabel(durationHours),
    capacity,
    priceOverride,
  }
}

async function seed() {
  const adminPassword = await bcrypt.hash("admin123", 10)
  const organizerPassword = await bcrypt.hash("organizer123", 10)
  const explorerPassword = await bcrypt.hash("explorer123", 10)

  // Quick-fill demo organizer used in login button
  await prisma.user.upsert({
    where: { email: "organizer.demo@together.dev" },
    update: {
      name: "Demo Organizer",
      role: "ORGANIZER",
      activeRole: "ORGANIZER",
      organizerStatus: "APPROVED",
      hashedPassword: organizerPassword,
    },
    create: {
      email: "organizer.demo@together.dev",
      name: "Demo Organizer",
      role: "ORGANIZER",
      activeRole: "ORGANIZER",
      organizerStatus: "APPROVED",
      hashedPassword: organizerPassword,
    },
  })

  // Admin user
  await prisma.user.upsert({
    where: { email: "admin@together.dev" },
    update: {
      name: "Admin",
      role: "ADMIN",
      activeRole: "ADMIN",
      hashedPassword: adminPassword,
    },
    create: {
      email: "admin@together.dev",
      name: "Admin",
      role: "ADMIN",
      activeRole: "ADMIN",
      hashedPassword: adminPassword,
    },
  })
  const explorerRecords = []

  for (const explorer of explorers) {
    const record = await prisma.user.upsert({
      where: { email: explorer.email },
      update: {
        name: explorer.name,
        image: explorer.image,
        location: explorer.location,
        role: "EXPLORER",
        activeRole: "EXPLORER",
        hashedPassword: explorerPassword,
      },
      create: {
        email: explorer.email,
        name: explorer.name,
        image: explorer.image,
        location: explorer.location,
        role: "EXPLORER",
        activeRole: "EXPLORER",
        hashedPassword: explorerPassword,
      },
    })

    explorerRecords.push(record)
  }

  for (const host of hosts) {
    const organizer = await prisma.user.upsert({
      where: { email: host.email },
      update: {
        name: host.name,
        headline: host.headline,
        bio: host.bio,
        location: host.location,
        image: host.image,
        website: host.website,
        role: "ORGANIZER",
        activeRole: "ORGANIZER",
        organizerStatus: "APPROVED",
        hashedPassword: organizerPassword,
      },
      create: {
        email: host.email,
        name: host.name,
        headline: host.headline,
        bio: host.bio,
        location: host.location,
        image: host.image,
        website: host.website,
        role: "ORGANIZER",
        activeRole: "ORGANIZER",
        organizerStatus: "APPROVED",
        hashedPassword: organizerPassword,
      },
    })

    for (const experience of host.experiences) {
      const baseSlug = slugify(experience.title) || "experience"
      let slug = baseSlug

      const existing = await prisma.experience.findUnique({ where: { slug: baseSlug } })
      if (existing && existing.organizerId !== organizer.id) {
        let suffix = 1
        let candidate = `${baseSlug}-${suffix}`
        while (await prisma.experience.findUnique({ where: { slug: candidate } })) {
          suffix += 1
          candidate = `${baseSlug}-${suffix}`
        }
        slug = candidate
      } else if (existing && existing.organizerId === organizer.id) {
        slug = existing.slug
      }

      await prisma.experience.upsert({
        where: { slug },
        update: {
          organizerId: organizer.id,
          title: experience.title,
          summary: experience.summary,
          description: experience.description,
          location: experience.location,
          duration: experience.duration,
          price: experience.price,
          currency: experience.currency ?? "USD",
          category: experience.category ?? "general",
          tags: experience.tags,
          heroImage: experience.heroImage,
          galleryImages: experience.galleryImages ?? [],
          averageRating: experience.averageRating,
          reviewCount: experience.reviewCount,
          meetingAddress: experience.meeting?.address ?? null,
          meetingCity: experience.meeting?.city ?? null,
          meetingCountry: experience.meeting?.country ?? null,
          meetingLatitude: experience.meeting?.latitude ?? null,
          meetingLongitude: experience.meeting?.longitude ?? null,
          sessions: {
            deleteMany: {},
            create: experience.sessions.map(buildSession),
          },
          itinerarySteps: {
            deleteMany: {},
            create: (experience.itinerary ?? []).map((step, index) => ({
              order: index,
              title: step.title,
              subtitle: step.subtitle ?? null,
              image: step.image,
            })),
          },
        },
        create: {
          organizerId: organizer.id,
          title: experience.title,
          summary: experience.summary,
          description: experience.description,
          location: experience.location,
          duration: experience.duration,
          price: experience.price,
          currency: experience.currency ?? "USD",
          category: experience.category ?? "general",
          tags: experience.tags,
          heroImage: experience.heroImage,
          galleryImages: experience.galleryImages ?? [],
          averageRating: experience.averageRating,
          reviewCount: experience.reviewCount,
          meetingAddress: experience.meeting?.address ?? null,
          meetingCity: experience.meeting?.city ?? null,
          meetingCountry: experience.meeting?.country ?? null,
          meetingLatitude: experience.meeting?.latitude ?? null,
          meetingLongitude: experience.meeting?.longitude ?? null,
          slug,
          sessions: {
            create: experience.sessions.map(buildSession),
          },
          itinerarySteps: {
            create: (experience.itinerary ?? []).map((step, index) => ({
              order: index,
              title: step.title,
              subtitle: step.subtitle ?? null,
              image: step.image,
            })),
          },
        },
      })
    }
  }

  const experiences = await prisma.experience.findMany({ select: { id: true } })

  for (const [experienceIndex, experience] of experiences.entries()) {
    await prisma.experienceReview.deleteMany({ where: { experienceId: experience.id } })

    const reviewCountTarget = Math.max(12, reviewTemplates.length)
    const reviewData = []
    let totalRating = 0

    for (let i = 0; i < reviewCountTarget; i += 1) {
      const template = reviewTemplates[(experienceIndex + i) % reviewTemplates.length]
      const explorer = explorerRecords[(experienceIndex + i) % explorerRecords.length]
      const createdAt = new Date(Date.now() - (experienceIndex * 7 + i) * 24 * 60 * 60 * 1000)

      reviewData.push({
        experienceId: experience.id,
        explorerId: explorer.id,
        rating: template.rating,
        comment: template.comment,
        createdAt,
      })

      totalRating += template.rating
    }

    await prisma.experienceReview.createMany({ data: reviewData })

    const averageRating = Number((totalRating / reviewData.length).toFixed(2))

    await prisma.experience.update({
      where: { id: experience.id },
      data: {
        averageRating,
        reviewCount: reviewData.length,
      },
    })
  }
}

seed()
  .then(() => {
    console.log("Seeded organizers, experiences, explorers, and reviews successfully.")
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
