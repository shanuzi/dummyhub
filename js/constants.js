// Values used in more than one place live here, so there are no "magic numbers".

export const API_BASE_URL = 'https://dummyjson.com';
export const LOGIN_EXPIRY_MINUTES = 30;
export const SESSION_STORAGE_KEY = 'dummyhub-session';

export const PRODUCTS_PER_PAGE = 12;
export const PRODUCT_CARD_FIELDS = 'title,price,discountPercentage,rating,stock,thumbnail,category';
export const DEFAULT_MINIMUM_ORDER = 1;

export const POSTS_PER_PAGE = 10;
export const POST_EXCERPT_LENGTH = 140;

export const PEOPLE_PER_PAGE = 20;
export const PEOPLE_CARD_FIELDS = 'firstName,lastName,age,image,role,company';

export const RECIPE_CARD_FIELDS =
  'name,image,difficulty,cuisine,rating,caloriesPerServing,prepTimeMinutes,cookTimeMinutes,mealType,tags';
export const MIN_SERVINGS = 1;
export const MAX_SERVINGS = 24;

// DummyJSON returns every item when limit is 0.
export const ALL_ITEMS_LIMIT = 0;

export const SEARCH_DEBOUNCE_MS = 300;
export const PERCENT_BASE = 100;
export const MAX_STAR_COUNT = 5;
