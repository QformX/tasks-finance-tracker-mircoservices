import { createContext, useContext, useState, type ReactNode } from "react";

type Language = "en" | "ru";

type Translations = {
  [key in Language]: {
    [key: string]: string;
  };
};

const translations: Translations = {
  en: {
    // Sidebar
    "dashboard": "Dashboard",
    "tasks": "Tasks",
    "purchases": "Purchases",
    "analytics": "Analytics",
    "categories": "Categories",
    "settings": "Settings",
    "logout": "Log out",
    
    // Auth
    "welcome_back": "Welcome back",
    "create_account": "Create an account",
    "sign_in_desc": "Sign in to access your workspace",
    "get_started_desc": "Get started with Cognito",
    "email": "Email address",
    "password": "Password",
    "username": "Username",
    "sign_in": "Sign in",
    "sign_up": "Sign up",
    "no_account": "Don't have an account?",
    "has_account": "Already have an account?",
    "auth_failed": "Authentication failed",

    // Settings
    "settings_title": "Settings",
    "settings_desc": "Manage your application preferences.",
    "general": "General",
    "language": "Language",
    "language_desc": "Select your preferred language for the interface.",
    "profile_settings": "Profile Settings",
    "profile_settings_desc": "Update your personal information and account security.",
    "edit_profile": "Edit Profile",

    // Profile
    "profile": "Profile",
    "profile_desc": "Manage your personal information and security settings.",
    "personal_info": "Personal Information",
    "display_name": "Display Name",
    "email_address": "Email Address",
    "bio": "Bio",
    "allowed_formats": "Allowed *.jpeg, *.jpg, *.png",
    "update_photo": "Update Photo",
    "remove_photo": "Remove",
    "save_changes": "Save Changes",
    "active_sessions": "Active Sessions",
    "current_session": "Current Session",
    "revoke": "Revoke",
    "delete_account": "Delete Account",
    "delete_account_desc": "Permanently remove your Personal Account and all of its contents from the Cognito platform. This action is not reversible, so please continue with caution.",
    "delete_account_btn": "Delete Account",
    
    // Profile Extra
    "active_sessions_desc": "Manage devices where you're currently logged in.",
    "sign_out_all": "Sign out all devices",
    "loading_sessions": "Loading sessions...",
    "no_sessions": "No active sessions found.",
    "unknown_device": "Unknown Device",
    "unknown_ip": "Unknown IP",
    "active_date": "Active",
    "preferences": "Preferences",
    "email_notifications": "Email Notifications",
    "email_notifications_desc": "Receive weekly summaries and important alerts.",
    "desktop_push": "Desktop Push",
    "desktop_push_desc": "Get notified immediately on your desktop when a task is due.",
    "theme_sync": "Theme Sync",
    "theme_sync_desc": "Match application theme with system settings.",

    // Common
    "loading": "Loading...",
    "error": "Error",
    "success": "Success",

    // Tasks
    "tasks_header": "Tasks",
    "new_task": "New Task",
    "search_tasks_placeholder": "Search tasks by name, tag, or assignee...",
    "all_tasks": "All Tasks",
    "today": "Today",
    "overdue": "Overdue",
    "completed": "Completed",
    "upcoming": "Upcoming",
    "loading_tasks": "Loading tasks...",
    "no_tasks_found": "No tasks found.",
    "delete_task_confirm": "Are you sure you want to delete this task?",

    // Purchases
    "purchases_header": "Purchases",
    "new_purchase": "New Purchase",
    "search_purchases_placeholder": "Search purchases...",
    "all_purchases": "All Purchases",
    "to_buy": "To Buy",
    "bought": "Bought",
    "loading_purchases": "Loading purchases...",
    "no_purchases_found": "No purchases found.",
    "no_items_to_buy": "No items to buy",
    "no_bought_items": "No bought items",
    "delete_purchase_confirm": "Are you sure you want to delete this purchase?",

    // Analytics
    "dashboard_overview": "Dashboard Overview",
    "dashboard_subtitle": "Welcome back, here's what's happening today.",
    "week": "Week",
    "month": "Month",
    "year": "Year",
    "loading_analytics": "Loading analytics...",
    "failed_analytics": "Failed to load analytics.",
    "total_spending": "Total Spending",
    "tasks_completed": "Tasks Completed",
    "tasks_created": "Tasks Created",
    "total_events": "Total Events",
    "todays_tasks": "Today's Tasks",
    "remaining": "Remaining",
    "no_tasks_today": "No tasks assigned for today.",
    "shopping_list": "Shopping List",
    "no_items_in_shopping_list": "No items in shopping list.",
    "activity_heatmap": "Activity Heatmap",
    "less": "Less",
    "more": "More",
    "recent_tasks": "Recent Tasks",
    "view_all": "View All",
    "no_recent_tasks": "No recent tasks",
    "recent_purchases_bought": "Recent Purchases (Bought)",
    "no_recent_purchases": "No recent purchases",
    "view_all_history": "View All History",
    "event_distribution": "Event Distribution",
    "spending_breakdown": "Spending Breakdown",
    "total": "Total",
    "more_categories": "more",
    "no_spending_data": "No spending data",
    "uncategorized": "Uncategorized",
    "purchases_created": "Purchases Created",
    "purchases_completed": "Purchases Completed",
    "total_needed": "Total Needed",

    // Categories
    "categories_header": "Categories",
    "edit_category": "Edit Category",
    "delete_category": "Delete Category",
    "create_first_category": "Create your first category",
    "create_category": "Create Category",
    "create_new_category": "Create New Category",
    "no_items_in_category": "No items in this category",
    "no_categories_found": "No categories found.",
    "add_task": "Add Task",
    "add_purchase": "Add Purchase",
    "loading_items": "Loading items...",
  },
  ru: {
    // Sidebar
    "dashboard": "Дашборд",
    "tasks": "Задачи",
    "purchases": "Покупки",
    "analytics": "Аналитика",
    "categories": "Категории",
    "settings": "Настройки",
    "logout": "Выйти",

    // Auth
    "welcome_back": "С возвращением",
    "create_account": "Создать аккаунт",
    "sign_in_desc": "Войдите, чтобы получить доступ к рабочему пространству",
    "get_started_desc": "Начните работу с Cognito",
    "email": "Email адрес",
    "password": "Пароль",
    "username": "Имя пользователя",
    "sign_in": "Войти",
    "sign_up": "Регистрация",
    "no_account": "Нет аккаунта?",
    "has_account": "Уже есть аккаунт?",
    "auth_failed": "Ошибка аутентификации",

    // Settings
    "settings_title": "Настройки",
    "settings_desc": "Управление настройками приложения.",
    "general": "Общие",
    "language": "Язык",
    "language_desc": "Выберите предпочтительный язык интерфейса.",
    "profile_settings": "Настройки профиля",
    "profile_settings_desc": "Обновите личную информацию и настройки безопасности.",
    "edit_profile": "Редактировать профиль",

    // Profile
    "profile": "Профиль",
    "profile_desc": "Управление личной информацией и настройками безопасности.",
    "personal_info": "Личная информация",
    "display_name": "Отображаемое имя",
    "email_address": "Email адрес",
    "bio": "О себе",
    "allowed_formats": "Допустимые форматы *.jpeg, *.jpg, *.png",
    "update_photo": "Обновить фото",
    "remove_photo": "Удалить",
    "save_changes": "Сохранить изменения",
    "active_sessions": "Активные сессии",
    "current_session": "Текущая сессия",
    "revoke": "Отозвать",
    "delete_account": "Удалить аккаунт",
    "delete_account_desc": "Безвозвратно удалить ваш личный аккаунт и все его содержимое с платформы Cognito. Это действие необратимо, пожалуйста, будьте осторожны.",
    "delete_account_btn": "Удалить аккаунт",

    // Profile Extra
    "active_sessions_desc": "Управление устройствами, на которых выполнен вход.",
    "sign_out_all": "Выйти со всех устройств",
    "loading_sessions": "Загрузка сессий...",
    "no_sessions": "Активных сессий не найдено.",
    "unknown_device": "Неизвестное устройство",
    "unknown_ip": "Неизвестный IP",
    "active_date": "Активен",
    "preferences": "Настройки",
    "email_notifications": "Email уведомления",
    "email_notifications_desc": "Получать еженедельные сводки и важные оповещения.",
    "desktop_push": "Push-уведомления",
    "desktop_push_desc": "Получать уведомления на рабочем столе, когда задача просрочена.",
    "theme_sync": "Синхронизация темы",
    "theme_sync_desc": "Соответствие темы приложения системным настройкам.",

    // Common
    "loading": "Загрузка...",
    "error": "Ошибка",
    "success": "Успешно",

    // Tasks
    "tasks_header": "Задачи",
    "new_task": "Новая задача",
    "search_tasks_placeholder": "Поиск задач по названию, тегу или исполнителю...",
    "all_tasks": "Все задачи",
    "today": "Сегодня",
    "overdue": "Просрочено",
    "completed": "Завершено",
    "upcoming": "Предстоящие",
    "loading_tasks": "Загрузка задач...",
    "no_tasks_found": "Задачи не найдены.",
    "delete_task_confirm": "Вы уверены, что хотите удалить эту задачу?",

    // Purchases
    "purchases_header": "Покупки",
    "new_purchase": "Новая покупка",
    "search_purchases_placeholder": "Поиск покупок...",
    "all_purchases": "Все покупки",
    "to_buy": "Купить",
    "bought": "Куплено",
    "loading_purchases": "Загрузка покупок...",
    "no_purchases_found": "Покупки не найдены.",
    "no_items_to_buy": "Нет товаров для покупки",
    "no_bought_items": "Нет купленных товаров",
    "delete_purchase_confirm": "Вы уверены, что хотите удалить эту покупку?",

    // Analytics
    "dashboard_overview": "Обзор дашборда",
    "dashboard_subtitle": "С возвращением! Вот что происходит сегодня.",
    "week": "Неделя",
    "month": "Месяц",
    "year": "Год",
    "loading_analytics": "Загрузка аналитики...",
    "failed_analytics": "Не удалось загрузить аналитику.",
    "total_spending": "Общие расходы",
    "tasks_completed": "Завершенные задачи",
    "tasks_created": "Созданные задачи",
    "total_events": "Всего событий",
    "todays_tasks": "Задачи на сегодня",
    "remaining": "Осталось",
    "no_tasks_today": "На сегодня задач нет.",
    "shopping_list": "Список покупок",
    "no_items_in_shopping_list": "В списке покупок нет товаров.",
    "activity_heatmap": "Тепловая карта активности",
    "less": "Меньше",
    "more": "Больше",
    "recent_tasks": "Недавние задачи",
    "view_all": "Смотреть все",
    "no_recent_tasks": "Нет недавних задач",
    "recent_purchases_bought": "Недавние покупки (Куплено)",
    "no_recent_purchases": "Нет недавних покупок",
    "view_all_history": "Смотреть всю историю",
    "event_distribution": "Распределение событий",
    "spending_breakdown": "Разбивка расходов",
    "total": "Всего",
    "more_categories": "еще",
    "no_spending_data": "Нет данных о расходах",
    "uncategorized": "Без категории",
    "purchases_created": "Создано покупок",
    "purchases_completed": "Завершено покупок",
    "total_needed": "Всего нужно",

    // Categories
    "categories_header": "Категории",
    "edit_category": "Редактировать категорию",
    "delete_category": "Удалить категорию",
    "create_first_category": "Создайте свою первую категорию",
    "create_category": "Создать категорию",
    "create_new_category": "Создать новую категорию",
    "no_items_in_category": "В этой категории нет элементов",
    "no_categories_found": "Категории не найдены.",
    "add_task": "Добавить задачу",
    "add_purchase": "Добавить покупку",
    "loading_items": "Загрузка элементов...",
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("language");
    return (saved === "ru" || saved === "en") ? saved : "en";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("language", lang);
  };

  const t = (key: string) => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
