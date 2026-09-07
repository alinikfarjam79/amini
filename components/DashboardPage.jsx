import { useEffect, useMemo, useState } from "react";
import { Header } from "./Header";
import { SearchBox } from "./SearchBox";
import { theme } from "../config/theme";
import {
  uploadProductsExcel,
  uploadQuantityExcel,
} from "../services/productUploadService";
import {
  normalizeCompanyUploads,
  searchCompanies,
  uploadCompanyFile,
} from "../services/companyService";
import { createUser, deleteUser, getUsers } from "../services/userService";
import {
  createWarehouse,
  getWarehouseId,
  getWarehouseItems,
  getWarehouses,
  uploadWarehouseProductsExcel,
} from "../services/warehouseService";
import { filterByProductSearch } from "../hook/useSearch";

const INVENTORY_STORAGE_KEY = "amini_xls_warehouse_inventory";

const getStoredInventories = () => {
  try {
    const inventories = JSON.parse(localStorage.getItem(INVENTORY_STORAGE_KEY));

    if (inventories && typeof inventories === "object") {
      return inventories;
    }
  } catch {
    localStorage.removeItem(INVENTORY_STORAGE_KEY);
  }

  return {};
};

const getUserId = (user) => user?._id || user?.id;
const isAdminUser = (user) => user?.role === "admin";
const getCompanyId = (company) => company?._id || company?.id || company?.code;
const getCompanyName = (company) =>
  company?.name ||
  company?.title ||
  company?.companyName ||
  company?.company_name ||
  company?.companyTitle ||
  company?.company ||
  company?.brandName ||
  company?.brand ||
  company?.nameFa ||
  company?.faName ||
  company?.["نام شرکت"] ||
  company?.["نام"] ||
  company?.["عنوان"] ||
  "-";
const isImageUpload = (upload) => {
  const mimeType = String(upload?.mimeType || "").toLowerCase();
  const url = String(upload?.url || "").toLowerCase();

  return (
    mimeType.startsWith("image/") ||
    /\.(png|jpe?g|webp|gif|bmp|svg)(\?.*)?$/.test(url)
  );
};
const getUploadDate = (upload) =>
  upload?.publishedAt ||
  upload?.uploadedAt ||
  upload?.createdAt ||
  upload?.updatedAt ||
  upload?.date ||
  upload?.uploadDate ||
  "";
const formatUploadDate = (value) => {
  if (!value) return "";

  const textValue = String(value).trim();
  const normalizedDigits = textValue
    .replace(/[۰-۹]/g, (digit) => "۰۱۲۳۴۵۶۷۸۹".indexOf(digit))
    .replace(/[٠-٩]/g, (digit) => "٠١٢٣٤٥٦٧٨٩".indexOf(digit));
  const jalaliDateMatch = normalizedDigits.match(
    /^(1[34]\d{2})[/-](\d{1,2})[/-](\d{1,2})$/,
  );

  if (jalaliDateMatch) {
    const [, year, month, day] = jalaliDateMatch;

    return `${year}/${month.padStart(2, "0")}/${day.padStart(2, "0")}`;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return textValue;
  }

  return date.toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};
const getUploadDateTime = (upload) => {
  const value = getUploadDate(upload);
  if (!value) return 0;

  const textValue = String(value).trim();
  const normalizedDigits = textValue
    .replace(/[۰-۹]/g, (digit) => "۰۱۲۳۴۵۶۷۸۹".indexOf(digit))
    .replace(/[٠-٩]/g, (digit) => "٠١٢٣٤٥٦٧٨٩".indexOf(digit));
  const jalaliDateMatch = normalizedDigits.match(
    /^(1[34]\d{2})[/-](\d{1,2})[/-](\d{1,2})$/,
  );

  if (jalaliDateMatch) {
    const [, year, month, day] = jalaliDateMatch;

    return Number(`${year}${month.padStart(2, "0")}${day.padStart(2, "0")}`);
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};
const sortUploadsByOldest = (uploads) =>
  [...uploads].sort((firstUpload, secondUpload) => {
    const secondTime = getUploadDateTime(secondUpload);
    const firstTime = getUploadDateTime(firstUpload);

    return firstTime - secondTime;
  });
const translateProductUploadError = (message = "") => {
  if (message.includes("قیمت اصلی") && message.includes("valid number")) {
    return "قیمت اصلی باید عدد معتبر باشد.";
  }

  return message || "ردیف معتبر نیست.";
};
const buildProductUploadMessage = (result) => {
  const invalidRows = Number(result?.invalidRows || 0);
  const zeroPriceCount = Array.isArray(result?.zeroPriceProducts)
    ? result.zeroPriceProducts.length
    : 0;

  if (invalidRows > 0 || zeroPriceCount > 0) {
    return "فایل آپلود شد، اما بعضی ردیف‌ها نیاز به بررسی دارند.";
  }

  return "فایل با موفقیت آپلود شد.";
};
const translateWarehouseUploadError = (message = "") => {
  if (message.includes("quantity") && message.includes("valid whole number")) {
    return "موجودی باید عدد صحیح معتبر باشد.";
  }

  return message || "ردیف معتبر نیست.";
};
const hasWarehouseUploadIssues = (result) => {
  const invalidRows = Number(result?.invalidRows || 0);
  const zeroOrNegativeCount = Array.isArray(
    result?.zeroOrNegativeQuantityProducts,
  )
    ? result.zeroOrNegativeQuantityProducts.length
    : 0;

  return invalidRows > 0 || zeroOrNegativeCount > 0;
};
const buildWarehouseUploadMessage = (result) => {
  if (hasWarehouseUploadIssues(result)) {
    return "فایل موجودی آپلود شد، اما بعضی ردیف‌ها نیاز به بررسی دارند.";
  }

  return "فایل موجودی انبار با موفقیت آپلود شد.";
};

export default function DashboardPage({ currentUser, onBack, onLogout }) {
  const isAdmin = currentUser?.role === "admin";
  const [activeSection, setActiveSection] = useState("dashboard");
  const [selectedWarehouseDetailsId, setSelectedWarehouseDetailsId] =
    useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCreateBoxOpen, setIsCreateBoxOpen] = useState(false);
  const [isInventoryPopupOpen, setIsInventoryPopupOpen] = useState(false);
  const [warehouseToDelete, setWarehouseToDelete] = useState(null);
  const [warehouseName, setWarehouseName] = useState("");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [inventoryFile, setInventoryFile] = useState(null);
  const [inventoryMessage, setInventoryMessage] = useState("");
  const [inventoryError, setInventoryError] = useState("");
  const [inventoryUploadDetails, setInventoryUploadDetails] = useState(null);
  const [isInventorySaving, setIsInventorySaving] = useState(false);
  const [warehousesLoading, setWarehousesLoading] = useState(false);
  const [warehouseItemsLoading, setWarehouseItemsLoading] = useState(false);
  const [warehouseSearchQuery, setWarehouseSearchQuery] = useState("");
  const [isWarehouseCreating, setIsWarehouseCreating] = useState(false);
  const [productsUploadFile, setProductsUploadFile] = useState(null);
  const [quantityUploadFile, setQuantityUploadFile] = useState(null);
  const [uploadState, setUploadState] = useState({
    products: { loading: false, message: "", error: "", details: null },
    quantity: { loading: false, message: "", error: "", details: null },
  });
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [usersMessage, setUsersMessage] = useState("");
  const [newUserPhoneNumber, setNewUserPhoneNumber] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserLoginMethod, setNewUserLoginMethod] = useState("password");
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [companySearchQuery, setCompanySearchQuery] = useState("");
  const [companies, setCompanies] = useState([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [companiesError, setCompaniesError] = useState("");
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companyUploads, setCompanyUploads] = useState([]);
  const [companyUploadsError, setCompanyUploadsError] = useState("");
  const [companyFileTitle, setCompanyFileTitle] = useState("");
  const [companyFileCompanyName, setCompanyFileCompanyName] = useState("");
  const [companyFileDate, setCompanyFileDate] = useState("");
  const [companyFile, setCompanyFile] = useState(null);
  const [companyFileUploadError, setCompanyFileUploadError] = useState("");
  const [companyFileUploadMessage, setCompanyFileUploadMessage] = useState("");
  const [isCompanyFileUploading, setIsCompanyFileUploading] = useState(false);
  const [companyFileInputKey, setCompanyFileInputKey] = useState(0);
  const [isCompanyNameDropdownOpen, setIsCompanyNameDropdownOpen] =
    useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [inventories, setInventories] = useState(getStoredInventories);

  useEffect(() => {
    localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(inventories));
  }, [inventories]);

  useEffect(() => {
    if (!selectedWarehouseId && warehouses.length > 0) {
      setSelectedWarehouseId(getWarehouseId(warehouses[0]));
    }
  }, [selectedWarehouseId, warehouses]);

  useEffect(() => {
    setWarehouseSearchQuery("");
  }, [selectedWarehouseDetailsId]);

  useEffect(() => {
    if (
      !isAdmin &&
      (activeSection === "warehouse" ||
        activeSection === "uploads" ||
        activeSection === "users" ||
        activeSection === "companyPrices" ||
        activeSection === "companyFileUpload")
    ) {
      setActiveSection("dashboard");
    }
  }, [activeSection, isAdmin]);

  const syncWarehouseItemsToCache = (warehouseId, items) => {
    setInventories((currentInventories) => ({
      ...currentInventories,
      [warehouseId]: {
        warehouseId,
        updatedAt: new Date().toISOString(),
        items,
      },
    }));
  };

  const loadWarehouses = async () => {
    if (!isAdmin) return;

    setWarehousesLoading(true);
    setInventoryError("");

    try {
      const nextWarehouses = await getWarehouses();
      setWarehouses(nextWarehouses);

      if (!selectedWarehouseId && nextWarehouses.length > 0) {
        setSelectedWarehouseId(getWarehouseId(nextWarehouses[0]));
      }
    } catch (error) {
      setInventoryError(error.message || "دریافت لیست انبارها ناموفق بود.");
    } finally {
      setWarehousesLoading(false);
    }
  };

  const loadWarehouseItems = async (warehouseId) => {
    if (!isAdmin || !warehouseId) return;

    setWarehouseItemsLoading(true);
    setInventoryError("");

    try {
      const items = await getWarehouseItems(warehouseId);
      syncWarehouseItemsToCache(warehouseId, items);
    } catch (error) {
      setInventoryError(error.message || "دریافت آیتم‌های انبار ناموفق بود.");
    } finally {
      setWarehouseItemsLoading(false);
    }
  };

  useEffect(() => {
    if (activeSection === "warehouse" && isAdmin) {
      loadWarehouses();
    }
  }, [activeSection, isAdmin]);

  useEffect(() => {
    if (selectedWarehouseDetailsId && isAdmin) {
      loadWarehouseItems(selectedWarehouseDetailsId);
    }
  }, [selectedWarehouseDetailsId, isAdmin]);

  const loadUsers = async () => {
    if (!isAdmin) return;

    setUsersLoading(true);
    setUsersError("");

    try {
      const nextUsers = await getUsers();
      setUsers(nextUsers);
    } catch (error) {
      setUsersError(error.message || "خطا در دریافت لیست کاربران.");
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (activeSection === "users" && isAdmin) {
      loadUsers();
    }
  }, [activeSection, isAdmin]);

  useEffect(() => {
    if (
      (activeSection !== "companyPrices" &&
        activeSection !== "companyFileUpload") ||
      !isAdmin
    ) {
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setCompaniesLoading(true);
      setCompaniesError("");

      try {
        const nextCompanies = await searchCompanies(
          activeSection === "companyPrices" ? companySearchQuery : "",
        );

        if (!controller.signal.aborted) {
          setCompanies(nextCompanies);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setCompaniesError(
            error.message || "خطا در دریافت لیست شرکت‌ها.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setCompaniesLoading(false);
        }
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [activeSection, isAdmin, companySearchQuery]);

  const selectedWarehouseDetails = useMemo(
    () =>
      warehouses.find(
        (warehouse) => getWarehouseId(warehouse) === selectedWarehouseDetailsId,
      ),
    [selectedWarehouseDetailsId, warehouses],
  );

  const selectedWarehouseInventory =
    inventories[selectedWarehouseDetailsId]?.items || [];
  const filteredWarehouseInventory = useMemo(() => {
    return filterByProductSearch(
      selectedWarehouseInventory,
      warehouseSearchQuery,
      (item) => ({
        title: item.title || "",
        barcode: item.code || item.barcode || item.productCode || "",
      }),
    );
  }, [selectedWarehouseInventory, warehouseSearchQuery]);
  const companyNameOptions = companies
    .map((company) => getCompanyName(company))
    .filter((companyName) => companyName && companyName !== "-");
  const filteredCompanyNameOptions = companyNameOptions.filter((companyName) =>
    companyName
      .toLowerCase()
      .includes(companyFileCompanyName.trim().toLowerCase()),
  );

  const navigationItems = [
    { id: "dashboard", label: "داشبورد مدیریت" },
    ...(isAdmin
      ? [
          { id: "warehouse", label: "مدیریت انبار" },
          { id: "uploads", label: "آپلود فایل‌ها" },
          { id: "companyPrices", label: "مدیریت لیست قیمت‌ها" },
          { id: "users", label: "مدیریت کاربران" },
        ]
      : []),
  ];

  const handleSectionChange = (sectionId) => {
    setActiveSection(sectionId);
    setSelectedWarehouseDetailsId("");
    setSelectedCompany(null);
    setIsSidebarOpen(false);
  };

  const handleBackToDashboard = () => {
    setActiveSection("dashboard");
    setSelectedWarehouseDetailsId("");
    setSelectedCompany(null);
    setIsSidebarOpen(false);
  };

  const managementActions = [
    {
      id: "warehouses",
      icon: "🏬",
      title: "مدیریت انبارها",
      description:
        "ساخت، مشاهده و حذف انبارها، بررسی موجودی ذخیره‌شده و به‌روزرسانی فایل موجودی.",
      sectionId: "warehouse",
      adminOnly: true,
    },
    {
      id: "company-prices",
      icon: "📋",
      title: "مدیریت لیست قیمت شرکت‌ها",
      description: "آپلود و بروزرسانی فایل‌های لیست محصولات و قیمت‌های شرکت‌ها.",
      sectionId: "companyPrices",
      adminOnly: true,
    },
    {
      id: "uploads",
      icon: "⬆️",
      title: "آپلود فایل‌ها",
      description: "ارسال فایل اکسل لیست محصولات و فایل اکسل مقادیر محصولات به سرور.",
      sectionId: "uploads",
      adminOnly: true,
    },
    {
      id: "users",
      icon: "👤",
      title: "مدیریت کاربران",
      description: "ساخت کاربر جدید، مشاهده لیست کاربران و حذف کاربران معمولی.",
      sectionId: "users",
      adminOnly: true,
    },
  ].filter((action) => !action.adminOnly || isAdmin);

  const handleManagementAction = (action) => {
    handleSectionChange(action.sectionId);
  };

  const handleCompanyClick = (company) => {
    const companyId = getCompanyId(company);

    if (!companyId) {
      setCompaniesError("شناسه شرکت برای دریافت فایل‌ها پیدا نشد.");
      return;
    }

    setSelectedCompany(company);
    setCompanyUploadsError("");

    try {
      const uploads = normalizeCompanyUploads(company);
      setCompanyUploads(sortUploadsByOldest(uploads));
    } catch (error) {
      setCompanyUploadsError(
        error.message || "خطا در خواندن فایل‌های شرکت.",
      );
    }
  };

  const openCompanyFileUploadPage = () => {
    setSelectedCompany(null);
    setCompanyUploads([]);
    setCompanyUploadsError("");
    setCompanyFileUploadError("");
    setCompanyFileUploadMessage("");
    setActiveSection("companyFileUpload");
  };

  const backToCompanyPrices = () => {
    setActiveSection("companyPrices");
    setCompanyFileUploadError("");
    setCompanyFileUploadMessage("");
  };

  const resetCompanyFileForm = () => {
    setCompanyFileTitle("");
    setCompanyFileCompanyName("");
    setCompanyFileDate("");
    setCompanyFile(null);
    setCompanyFileInputKey((currentKey) => currentKey + 1);
  };

  const handleCompanyFileUpload = async (event) => {
    event.preventDefault();

    const title = companyFileTitle.trim();
    const companyName = companyFileCompanyName.trim();

    if (!title || !companyName || !companyFileDate || !companyFile) {
      setCompanyFileUploadError("همه فیلدها باید تکمیل شوند.");
      setCompanyFileUploadMessage("");
      return;
    }

    setIsCompanyFileUploading(true);
    setCompanyFileUploadError("");
    setCompanyFileUploadMessage("");

    try {
      await uploadCompanyFile({
        companyName,
        title,
        publishDate: companyFileDate,
        file: companyFile,
      });
      setCompanyFileUploadMessage("فایل با موفقیت ثبت شد.");
      resetCompanyFileForm();
      setCompanySearchQuery(companyName);
      setActiveSection("companyPrices");
    } catch (error) {
      setCompanyFileUploadError(error.message || "ثبت فایل ناموفق بود.");
    } finally {
      setIsCompanyFileUploading(false);
    }
  };

  const handleCreateWarehouse = async (event) => {
    event.preventDefault();

    const name = warehouseName.trim();
    if (!name) return;

    setIsWarehouseCreating(true);
    setInventoryError("");
    setInventoryMessage("");

    try {
      const newWarehouse = await createWarehouse({ name, isActive: true });
      const newWarehouseId = getWarehouseId(newWarehouse);

      setWarehouses((currentWarehouses) => [...currentWarehouses, newWarehouse]);
      setSelectedWarehouseId(newWarehouseId || "");
      setWarehouseName("");
      setIsCreateBoxOpen(false);
      setInventoryMessage("انبار با موفقیت ساخته شد.");
    } catch (error) {
      setInventoryError(error.message || "ساخت انبار ناموفق بود.");
    } finally {
      setIsWarehouseCreating(false);
    }
  };

  const openDeleteWarehousePopup = (warehouse) => {
    setWarehouseToDelete(warehouse);
  };

  const closeDeleteWarehousePopup = () => {
    setWarehouseToDelete(null);
  };

  const confirmDeleteWarehouse = () => {
    setInventoryError("API حذف انبار هنوز تعریف نشده است.");
    setInventoryMessage("");
    setWarehouseToDelete(null);
  };

  const openInventoryPopup = () => {
    if (warehouses.length === 0) {
      setInventoryError("ابتدا باید یک انبار بسازید.");
      setInventoryMessage("");
      return;
    }

    setInventoryError("");
    setInventoryMessage("");
    setInventoryUploadDetails(null);
    setIsInventoryPopupOpen(true);
  };

  const closeInventoryPopup = () => {
    setIsInventoryPopupOpen(false);
    setInventoryFile(null);
    setInventoryError("");
    setInventoryUploadDetails(null);
  };

  const handleInventoryUpdate = async (event) => {
    event.preventDefault();

    if (!inventoryFile || !selectedWarehouseId) return;

    setIsInventorySaving(true);
    setInventoryError("");
    setInventoryMessage("");
    setInventoryUploadDetails(null);

    try {
      const uploadDetails = await uploadWarehouseProductsExcel(
        selectedWarehouseId,
        inventoryFile,
      );
      const items = await getWarehouseItems(selectedWarehouseId);
      syncWarehouseItemsToCache(selectedWarehouseId, items);

      setInventoryUploadDetails(uploadDetails);
      setInventoryMessage(buildWarehouseUploadMessage(uploadDetails));
      setInventoryFile(null);

      if (!hasWarehouseUploadIssues(uploadDetails)) {
        setIsInventoryPopupOpen(false);
      }
    } catch (error) {
      setInventoryError(error.message || "آپلود فایل موجودی ناموفق بود.");
      setInventoryUploadDetails(null);
    } finally {
      setIsInventorySaving(false);
    }
  };

  const updateUploadState = (type, nextState) => {
    setUploadState((currentState) => ({
      ...currentState,
      [type]: {
        ...currentState[type],
        ...nextState,
      },
    }));
  };

  const handleServerExcelUpload = async (event, type) => {
    event.preventDefault();

    const file = type === "products" ? productsUploadFile : quantityUploadFile;
    if (!file) return;

    updateUploadState(type, {
      loading: true,
      message: "",
      error: "",
      details: null,
    });

    try {
      let uploadDetails = null;

      if (type === "products") {
        uploadDetails = await uploadProductsExcel(file);
        setProductsUploadFile(null);
      } else {
        await uploadQuantityExcel(file);
        setQuantityUploadFile(null);
      }

      updateUploadState(type, {
        loading: false,
        message:
          type === "products"
            ? buildProductUploadMessage(uploadDetails)
            : "فایل با موفقیت آپلود شد.",
        error: "",
        details: type === "products" ? uploadDetails : null,
      });
    } catch (error) {
      updateUploadState(type, {
        loading: false,
        message: "",
        error: error.message || "آپلود فایل ناموفق بود.",
        details: null,
      });
    }
  };

  const handleCreateUser = async (event) => {
    event.preventDefault();

    const phoneNumber = newUserPhoneNumber.trim();
    const password = newUserPassword.trim();

    if (!phoneNumber) {
      setUsersError("شماره موبایل الزامی است.");
      return;
    }

    if (newUserLoginMethod === "password" && !password) {
      setUsersError("رمز عبور برای ورود با password الزامی است.");
      return;
    }

    setIsCreatingUser(true);
    setUsersError("");
    setUsersMessage("");

    try {
      await createUser({
        phoneNumber,
        password,
        loginMethod: newUserLoginMethod,
      });

      setNewUserPhoneNumber("");
      setNewUserPassword("");
      setNewUserLoginMethod("password");
      setUsersMessage("کاربر با موفقیت ساخته شد.");
      await loadUsers();
    } catch (error) {
      setUsersError(error.message || "ساخت کاربر ناموفق بود.");
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleNewUserLoginMethodChange = (event) => {
    const nextLoginMethod = event.target.value;
    setNewUserLoginMethod(nextLoginMethod);

    if (nextLoginMethod === "otp") {
      setNewUserPassword("");
    }
  };

  const openDeleteUserPopup = (user) => {
    if (isAdminUser(user)) return;

    setUsersError("");
    setUsersMessage("");
    setUserToDelete(user);
  };

  const closeDeleteUserPopup = () => {
    if (isDeletingUser) return;

    setUserToDelete(null);
  };

  const confirmDeleteUser = async () => {
    const userId = getUserId(userToDelete);

    if (isAdminUser(userToDelete)) {
      setUsersError("امکان حذف کاربر ادمین وجود ندارد.");
      setUserToDelete(null);
      return;
    }

    if (!userId) {
      setUsersError("شناسه کاربر برای حذف پیدا نشد.");
      setUserToDelete(null);
      return;
    }

    setIsDeletingUser(true);
    setUsersError("");
    setUsersMessage("");

    try {
      await deleteUser(userId);
      setUsers((currentUsers) =>
        currentUsers.filter((user) => getUserId(user) !== userId),
      );
      setUsersMessage("کاربر با موفقیت حذف شد.");
      setUserToDelete(null);
    } catch (error) {
      setUsersError(error.message || "حذف کاربر ناموفق بود.");
    } finally {
      setIsDeletingUser(false);
    }
  };

  const UploadCard = ({
    type,
    title,
    description,
    file,
    onFileChange,
  }) => {
    const state = uploadState[type];
    const inputId = `${type}-excel-file`;

    return (
      <form
        onSubmit={(event) => handleServerExcelUpload(event, type)}
        className="rounded-md border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className={`text-base font-bold ${theme.colors.text.primary}`}>
              {title}
            </h3>
            <p className={`mt-1 text-sm leading-6 ${theme.colors.text.muted}`}>
              {description}
            </p>
          </div>

          <button
            type="submit"
            disabled={!file || state.loading}
            className="min-h-11 rounded-md bg-amber-500 px-5 text-sm font-bold text-slate-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {state.loading ? "در حال آپلود..." : "آپلود فایل"}
          </button>
        </div>

        <label
          htmlFor={inputId}
          className={`mt-5 block text-sm font-bold ${theme.colors.text.primary}`}
        >
          انتخاب فایل XLS , XLSX
        </label>
        <input
          id={inputId}
          type="file"
          accept=".xls,.xlsx"
          disabled={state.loading}
          onChange={(event) => onFileChange(event.target.files?.[0] || null)}
          className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:ml-3 file:rounded-md file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:text-sm file:font-bold file:text-white disabled:opacity-60"
        />

        {file && (
          <p className="mt-3 text-sm font-bold text-slate-800">
            فایل انتخاب‌شده: {file.name}
          </p>
        )}

        {(state.message || state.error) && (
          <div
            className={`mt-4 rounded-md px-4 py-3 text-sm font-bold ${
              state.error
                ? "border border-red-200 bg-red-50 text-red-700"
                : "border border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {state.error || state.message}
          </div>
        )}

        {type === "products" && state.details && !state.error && (
          <div className="mt-4 space-y-4 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <span className="block text-xs text-slate-500">کل ردیف‌ها</span>
                <span className="font-bold">
                  {Number(state.details.totalRows || 0).toLocaleString("fa-IR")}
                </span>
              </div>
              <div>
                <span className="block text-xs text-slate-500">ردیف معتبر</span>
                <span className="font-bold text-emerald-700">
                  {Number(state.details.validRows || 0).toLocaleString("fa-IR")}
                </span>
              </div>
              <div>
                <span className="block text-xs text-slate-500">ردیف خراب</span>
                <span className="font-bold text-red-700">
                  {Number(state.details.invalidRows || 0).toLocaleString("fa-IR")}
                </span>
              </div>
              <div>
                <span className="block text-xs text-slate-500">اضافه‌شده</span>
                <span className="font-bold">
                  {Number(state.details.inserted || 0).toLocaleString("fa-IR")}
                </span>
              </div>
              <div>
                <span className="block text-xs text-slate-500">آپدیت‌شده</span>
                <span className="font-bold">
                  {Number(state.details.updated || 0).toLocaleString("fa-IR")}
                </span>
              </div>
            </div>

            {Array.isArray(state.details.zeroPriceProducts) &&
              state.details.zeroPriceProducts.length > 0 && (
                <div>
                  <h4 className="mb-2 font-bold text-amber-700">
                    محصولات با قیمت صفر
                  </h4>
                  <div className="overflow-x-auto rounded-md border border-amber-200 bg-white">
                    <div className="min-w-[560px] divide-y divide-amber-100">
                      {state.details.zeroPriceProducts.map((product, index) => (
                        <div
                          key={`${product.productCode || product.row}-${index}`}
                          className="grid grid-cols-[80px_1fr_140px] gap-3 px-3 py-2"
                        >
                          <span>ردیف {product.row?.toLocaleString?.("fa-IR") || product.row}</span>
                          <span className="font-bold">{product.title || "-"}</span>
                          <span className="font-mono">{product.productCode || "-"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            {Array.isArray(state.details.errors) &&
              state.details.errors.length > 0 && (
                <div>
                  <h4 className="mb-2 font-bold text-red-700">
                    ردیف‌های خراب
                  </h4>
                  <div className="overflow-x-auto rounded-md border border-red-200 bg-white">
                    <div className="min-w-[640px] divide-y divide-red-100">
                      {state.details.errors.map((rowError, index) => (
                        <div
                          key={`${rowError.productCode || rowError.row}-${index}`}
                          className="grid grid-cols-[80px_1fr_140px_1.2fr] gap-3 px-3 py-2"
                        >
                          <span>ردیف {rowError.row?.toLocaleString?.("fa-IR") || rowError.row}</span>
                          <span className="font-bold">{rowError.title || "-"}</span>
                          <span className="font-mono">{rowError.productCode || "-"}</span>
                          <span className="text-red-700">
                            {translateProductUploadError(rowError.message)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
          </div>
        )}
      </form>
    );
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 px-5 py-5">
        <p className={`text-xs font-bold ${theme.colors.text.muted}`}>
          پنل مدیریت
        </p>
      </div>

      <nav className="flex-1 space-y-2 px-3 py-4" aria-label="منوی داشبورد">
        {navigationItems.map((item) => {
          const isActive = activeSection === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSectionChange(item.id)}
              className={`flex w-full items-center justify-between rounded-md px-4 py-3 text-right text-sm font-bold transition-colors ${
                isActive
                  ? "bg-amber-500 text-slate-950 shadow-sm"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <span>{item.label}</span>
              {isActive && (
                <span className="h-2 w-2 rounded-full bg-slate-950" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );

  const pageTitle = selectedWarehouseDetails
    ? selectedWarehouseDetails.name
    : activeSection === "warehouse"
      ? "مدیریت انبار"
    : activeSection === "uploads" && isAdmin
        ? "آپلود فایل‌ها"
      : activeSection === "companyPrices" && isAdmin
        ? "مدیریت لیست قیمت‌ها"
      : activeSection === "companyFileUpload" && isAdmin
        ? "آپلود فایل شرکت"
      : activeSection === "users" && isAdmin
        ? "مدیریت کاربران"
      : "داشبورد مدیریت";

  return (
    <div
      dir="rtl"
      className={`min-h-screen ${theme.colors.background.page} font-['Vazirmatn',_'Noto_Sans_Arabic',_sans-serif]`}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
      `}</style>

      <Header
        productCount={0}
        isUsingCache={false}
        currentUser={currentUser}
        onBack={onBack}
        onLogout={onLogout}
      />

      <div className="mx-auto flex min-h-[calc(100vh-89px)] max-w-7xl">
        <aside className="hidden w-64 shrink-0 border-l border-slate-200 bg-white lg:block">
          <SidebarContent />
        </aside>

        {isSidebarOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button
              type="button"
              aria-label="بستن منو"
              className="absolute inset-0 bg-slate-950/40"
              onClick={() => setIsSidebarOpen(false)}
            />
            <aside className="absolute right-0 top-0 h-full w-72 max-w-[82vw] border-l border-slate-200 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <span
                  className={`text-sm font-bold ${theme.colors.text.primary}`}
                >
                  منو
                </span>
                <button
                  type="button"
                  aria-label="بستن منو"
                  onClick={() => setIsSidebarOpen(false)}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-bold text-slate-700"
                >
                  بستن
                </button>
              </div>
              <SidebarContent />
            </aside>
          </div>
        )}

        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:py-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {selectedWarehouseDetails && (
                <button
                  type="button"
                  onClick={() => setSelectedWarehouseDetailsId("")}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100"
                >
                  بازگشت
                </button>
              )}
              <h2 className={`text-lg font-bold ${theme.colors.text.primary}`}>
                {pageTitle}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {activeSection !== "dashboard" && (
                <button
                  type="button"
                  onClick={handleBackToDashboard}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100"
                >
                  بازگشت به داشبورد
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 lg:hidden"
              >
                منو
              </button>
            </div>
          </div>

          {activeSection === "dashboard" ? (
            <section className="space-y-5">
              <div>
                <h3 className={`text-base font-bold ${theme.colors.text.primary}`}>
                  عملیات مدیریتی
                </h3>
                <p className={`mt-1 text-sm ${theme.colors.text.muted}`}>
                  عملیات مورد نیاز خود را انتخاب کنید تا وارد بخش مربوطه شوید.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {managementActions.map((action) => (
                  <article
                    key={action.id}
                    className="flex min-h-56 flex-col justify-between rounded-md border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-amber-300"
                  >
                    <div>
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-amber-500/15 text-2xl">
                        <span aria-hidden="true">{action.icon}</span>
                      </div>
                      <h4 className={`text-base font-bold ${theme.colors.text.primary}`}>
                        {action.title}
                      </h4>
                      <p className={`mt-2 text-sm leading-7 ${theme.colors.text.muted}`}>
                        {action.description}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleManagementAction(action)}
                      className="mt-5 min-h-11 rounded-md bg-amber-500 px-4 text-sm font-bold text-slate-950 transition-colors hover:bg-amber-400"
                    >
                      ورود
                    </button>
                  </article>
                ))}
              </div>
            </section>
          ) : activeSection === "companyFileUpload" && isAdmin ? (
            <section className="space-y-5">
              {(companyFileUploadMessage || companyFileUploadError) && (
                <div
                  className={`rounded-md px-4 py-3 text-sm font-bold ${
                    companyFileUploadError
                      ? "border border-red-200 bg-red-50 text-red-700"
                      : "border border-emerald-200 bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {companyFileUploadError || companyFileUploadMessage}
                </div>
              )}

              <form
                onSubmit={handleCompanyFileUpload}
                className="rounded-md border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className={`text-base font-bold ${theme.colors.text.primary}`}>
                      ساخت فایل جدید شرکت
                    </h3>
                    <p className={`mt-1 text-sm ${theme.colors.text.muted}`}>
                      همه فیلدها الزامی هستند.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={backToCompanyPrices}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100"
                  >
                    بازگشت به لیست شرکت‌ها
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className={`text-sm font-bold ${theme.colors.text.primary}`}>
                      عنوان
                    </span>
                    <input
                      type="text"
                      value={companyFileTitle}
                      onChange={(event) => setCompanyFileTitle(event.target.value)}
                      required
                      className="mt-2 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-right text-sm text-slate-800 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                    />
                  </label>

                  <label className="relative block">
                    <span className={`text-sm font-bold ${theme.colors.text.primary}`}>
                      نام شرکت
                    </span>
                    <input
                      type="text"
                      value={companyFileCompanyName}
                      onChange={(event) => {
                        setCompanyFileCompanyName(event.target.value);
                        setIsCompanyNameDropdownOpen(true);
                      }}
                      onFocus={() => setIsCompanyNameDropdownOpen(true)}
                      onBlur={() => {
                        window.setTimeout(
                          () => setIsCompanyNameDropdownOpen(false),
                          120,
                        );
                      }}
                      required
                      className="mt-2 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-right text-sm text-slate-800 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                    />
                    {isCompanyNameDropdownOpen && (
                      <div className="absolute right-0 top-full z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-xl">
                        {companiesLoading ? (
                          <div className={`px-3 py-3 text-sm ${theme.colors.text.muted}`}>
                            در حال دریافت شرکت‌ها...
                          </div>
                        ) : filteredCompanyNameOptions.length > 0 ? (
                          filteredCompanyNameOptions.map((companyName) => (
                            <button
                              key={companyName}
                              type="button"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => {
                                setCompanyFileCompanyName(companyName);
                                setIsCompanyNameDropdownOpen(false);
                              }}
                              className="block w-full px-3 py-2 text-right text-sm font-bold text-slate-700 transition-colors hover:bg-slate-100"
                            >
                              {companyName}
                            </button>
                          ))
                        ) : (
                          <div className={`px-3 py-3 text-sm ${theme.colors.text.muted}`}>
                            شرکتی برای نمایش وجود ندارد.
                          </div>
                        )}
                      </div>
                    )}
                    {companiesLoading && (
                      <p className={`mt-2 text-xs ${theme.colors.text.muted}`}>
                        در حال دریافت شرکت‌ها...
                      </p>
                    )}
                    {!companiesLoading && companiesError && (
                      <p className="mt-2 text-xs font-bold text-red-600">
                        {companiesError}
                      </p>
                    )}
                  </label>

                  <label className="block">
                    <span className={`text-sm font-bold ${theme.colors.text.primary}`}>
                      افزودن فایل
                    </span>
                    <input
                      key={companyFileInputKey}
                      type="file"
                      onChange={(event) =>
                        setCompanyFile(event.target.files?.[0] || null)
                      }
                      required
                      className="mt-2 block min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:ml-3 file:rounded-md file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:text-sm file:font-bold file:text-white"
                    />
                  </label>

                  <label className="block">
                    <span className={`text-sm font-bold ${theme.colors.text.primary}`}>
                      تاریخ
                    </span>
                    <input
                      type="text"
                      value={companyFileDate}
                      onChange={(event) => setCompanyFileDate(event.target.value)}
                      placeholder="مثلاً 1405/05/03"
                      required
                      className="mt-2 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-right text-sm text-slate-800 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                    />
                  </label>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    type="submit"
                    disabled={isCompanyFileUploading}
                    className="min-h-11 rounded-md bg-amber-500 px-6 text-sm font-bold text-slate-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isCompanyFileUploading ? "در حال ساخت..." : "ساخت"}
                  </button>
                </div>
              </form>
            </section>
          ) : activeSection === "companyPrices" && isAdmin ? (
            <section className="space-y-5">
              {selectedCompany ? (
                <>
                  <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className={`text-base font-bold ${theme.colors.text.primary}`}>
                          {getCompanyName(selectedCompany)}
                        </h3>
                        <p className={`mt-1 text-sm ${theme.colors.text.muted}`}>
                          فایل‌ها و تصاویر آپلود شده برای این شرکت
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCompany(null);
                          setCompanyUploads([]);
                          setCompanyUploadsError("");
                        }}
                        className="rounded-md border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100"
                      >
                        بازگشت به لیست شرکت‌ها
                      </button>
                    </div>
                  </div>

                  {companyUploadsError ? (
                    <div className="rounded-md border border-red-200 bg-red-50 px-4 py-8 text-center text-sm font-bold text-red-700">
                      {companyUploadsError}
                    </div>
                  ) : companyUploads.length === 0 ? (
                    <div className={`rounded-md border border-slate-200 bg-white px-4 py-8 text-center text-sm ${theme.colors.text.muted}`}>
                      فایلی برای این شرکت ثبت نشده است.
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {companyUploads.map((upload, index) => {
                        const isImage = isImageUpload(upload);
                        const uploadDate = formatUploadDate(getUploadDate(upload));

                        return (
                          <article
                            key={upload.id || index}
                            className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm"
                          >
                            {isImage && upload.url ? (
                              <img
                                src={upload.url}
                                alt={upload.title}
                                crossOrigin="anonymous"
                                className="h-48 w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-48 items-center justify-center bg-slate-50 text-5xl text-slate-400">
                                📄
                              </div>
                            )}

                            <div className="p-4">
                              <h4 className="line-clamp-2 text-sm font-bold text-slate-800">
                                {upload.title}
                              </h4>
                              {upload.mimeType && (
                                <p className={`mt-1 text-xs ${theme.colors.text.muted}`}>
                                  {upload.mimeType}
                                </p>
                              )}
                              {uploadDate && (
                                <p className={`mt-1 text-xs ${theme.colors.text.muted}`}>
                                  تاریخ: {uploadDate}
                                </p>
                              )}
                              {upload.url ? (
                                <a
                                  href={upload.url}
                                  download={!isImage}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-4 inline-flex min-h-10 items-center rounded-md bg-amber-500 px-4 text-sm font-bold text-slate-950 transition-colors hover:bg-amber-400"
                                >
                                  {isImage ? "مشاهده تصویر" : "دانلود فایل"}
                                </a>
                              ) : (
                                <p className="mt-4 text-sm font-bold text-red-600">
                                  لینک فایل موجود نیست.
                                </p>
                              )}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={openCompanyFileUploadPage}
                      className="min-h-11 rounded-md bg-amber-500 px-5 text-sm font-bold text-slate-950 transition-colors hover:bg-amber-400"
                    >
                      آپلود فایل
                    </button>
                  </div>

                  <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <h3 className={`text-base font-bold ${theme.colors.text.primary}`}>
                          لیست شرکت‌ها
                        </h3>
                        <p className={`mt-1 text-sm ${theme.colors.text.muted}`}>
                          نام شرکت را جستجو کنید تا نتیجه از سرور دریافت شود.
                        </p>
                      </div>

                      <div className="relative w-full sm:w-80">
                        <span className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                          🔍
                        </span>
                        <input
                          dir="rtl"
                          type="text"
                          value={companySearchQuery}
                          onChange={(event) =>
                            setCompanySearchQuery(event.target.value)
                          }
                          placeholder="جستجو بر اساس نام شرکت..."
                          className={`
                            w-full pr-9 pl-4 py-2 rounded-xl text-sm text-white
                            ${theme.colors.background.input}
                            ${theme.colors.border.surface}
                            ${theme.colors.border.focus}
                            placeholder:${theme.colors.text.muted}
                            outline-none transition-all duration-200
                          `}
                        />
                        {companySearchQuery && (
                          <button
                            type="button"
                            onClick={() => setCompanySearchQuery("")}
                            className="absolute inset-y-0 left-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                            aria-label="پاک کردن جستجو"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
                    <div className="grid grid-cols-[1fr_0.8fr_96px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
                      <span>نام شرکت</span>
                      <span>شناسه</span>
                      <span>عملیات</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {companiesLoading && companies.length === 0 ? (
                        <p className={`px-4 py-8 text-center text-sm ${theme.colors.text.muted}`}>
                          در حال دریافت شرکت‌ها...
                        </p>
                      ) : companiesError ? (
                        <p className="px-4 py-8 text-center text-sm font-bold text-red-600">
                          {companiesError}
                        </p>
                      ) : companies.length === 0 ? (
                        <p className={`px-4 py-8 text-center text-sm ${theme.colors.text.muted}`}>
                          شرکتی برای نمایش وجود ندارد.
                        </p>
                      ) : (
                        companies.map((company, index) => (
                          <button
                            key={getCompanyId(company) || index}
                            type="button"
                            onClick={() => handleCompanyClick(company)}
                            className="grid w-full grid-cols-[1fr_0.8fr_96px] items-center gap-3 px-4 py-4 text-right text-sm transition-colors hover:bg-slate-50"
                          >
                            <span className="font-bold text-slate-800">
                              {getCompanyName(company)}
                            </span>
                            <span className="break-all font-mono text-slate-600">
                              {getCompanyId(company) || "-"}
                            </span>
                            <span className="rounded-md border border-slate-300 px-3 py-2 text-center text-xs font-bold text-slate-700">
                              مشاهده
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </section>
          ) : activeSection === "uploads" && isAdmin ? (
            <section className="space-y-5">
              <UploadCard
                type="products"
                title="آپلود لیست قیمت محصولات"
                file={productsUploadFile}
                onFileChange={setProductsUploadFile}
              />

            </section>
          ) : activeSection === "users" && isAdmin ? (
            <section className="space-y-5">
              {(usersMessage || usersError) && (
                <div
                  className={`rounded-md px-4 py-3 text-sm font-bold ${
                    usersError
                      ? "border border-red-200 bg-red-50 text-red-700"
                      : "border border-emerald-200 bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {usersError || usersMessage}
                </div>
              )}

              <form
                onSubmit={handleCreateUser}
                className="rounded-md border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className={`text-base font-bold ${theme.colors.text.primary}`}>
                      ساخت کاربر جدید
                    </h3>
                    <p className={`mt-1 text-sm ${theme.colors.text.muted}`}>
                      نقش کاربر همیشه user ثبت می‌شود.
                    </p>
                  </div>
                  <button
                    type="submit"
                    disabled={isCreatingUser}
                    className="min-h-11 rounded-md bg-amber-500 px-5 text-sm font-bold text-slate-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isCreatingUser ? "در حال ساخت..." : "ساخت کاربر"}
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <label className="block">
                    <span className={`text-sm font-bold ${theme.colors.text.primary}`}>
                      شماره موبایل
                    </span>
                    <input
                      type="tel"
                      inputMode="tel"
                      value={newUserPhoneNumber}
                      onChange={(event) => setNewUserPhoneNumber(event.target.value)}
                      className="mt-2 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-right text-sm text-slate-800 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                    />
                  </label>

                  <label className="block">
                    <span className={`text-sm font-bold ${theme.colors.text.primary}`}>
                      رمز عبور
                    </span>
                    <input
                      type="password"
                      value={newUserPassword}
                      onChange={(event) => setNewUserPassword(event.target.value)}
                      disabled={newUserLoginMethod === "otp"}
                      className="mt-2 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-right text-sm text-slate-800 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  </label>

                  <label className="block">
                    <span className={`text-sm font-bold ${theme.colors.text.primary}`}>
                      روش ورود
                    </span>
                    <select
                      value={newUserLoginMethod}
                      onChange={handleNewUserLoginMethodChange}
                      className="mt-2 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-right text-sm text-slate-800 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                    >
                      <option value="password">password</option>
                      <option value="otp">otp</option>
                    </select>
                  </label>
                </div>
              </form>

              <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <h3 className="text-sm font-bold text-slate-700">
                    لیست کاربران
                  </h3>
                  <button
                    type="button"
                    onClick={loadUsers}
                    disabled={usersLoading}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {usersLoading ? "در حال دریافت..." : "بروزرسانی لیست"}
                  </button>
                </div>

                <div className="overflow-x-auto">
                  {usersLoading && users.length === 0 ? (
                    <p className={`px-4 py-8 text-center text-sm ${theme.colors.text.muted}`}>
                      در حال دریافت کاربران...
                    </p>
                  ) : users.length === 0 ? (
                    <p className={`px-4 py-8 text-center text-sm ${theme.colors.text.muted}`}>
                      کاربری برای نمایش وجود ندارد.
                    </p>
                  ) : (
                    <div className="min-w-[620px]">
                      <div className="grid grid-cols-[1fr_0.7fr_0.7fr_112px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
                        <span>شماره موبایل</span>
                        <span>نقش</span>
                        <span>روش ورود</span>
                        <span>عملیات</span>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {users.map((user) => (
                          <div
                            key={user._id || user.id || user.phoneNumber}
                            className="grid grid-cols-[1fr_0.7fr_0.7fr_112px] items-center gap-3 px-4 py-4 text-sm"
                          >
                            <span className="font-bold text-slate-800">
                              {user.phoneNumber || user.username || "-"}
                            </span>
                            <span className="text-slate-600">
                              {user.role || "-"}
                            </span>
                            <span className="text-slate-600">
                              {user.loginMethod || "-"}
                            </span>
                            {isAdminUser(user) ? (
                              <span className="w-fit rounded-md border border-slate-200 px-3 py-2 text-xs font-bold text-slate-500">
                                غیرقابل حذف
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openDeleteUserPopup(user)}
                                disabled={!getUserId(user)}
                                className="w-fit rounded-md border border-red-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                حذف
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          ) : selectedWarehouseDetails ? (
            <section className="space-y-5">
              <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className={`text-base font-bold ${theme.colors.text.primary}`}>
                  موجودی ذخیره شده
                </h3>
                <p className={`mt-1 text-sm ${theme.colors.text.muted}`}>
                  {selectedWarehouseInventory.length.toLocaleString("fa-IR")} آیتم
                  برای این انبار ذخیره شده است.
                </p>
              </div>

              <div dir="rtl" className="flex items-center justify-start">
                <SearchBox
                  query={warehouseSearchQuery}
                  onChange={setWarehouseSearchQuery}
                />
              </div>

              <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <div className="min-w-[560px]">
                    <div className="grid grid-cols-[1.4fr_0.5fr_0.8fr] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
                      <span>عنوان محصول</span>
                      <span>موجودی</span>
                      <span>کد</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {warehouseItemsLoading ? (
                        <p className={`px-4 py-8 text-center text-sm ${theme.colors.text.muted}`}>
                          در حال دریافت آیتم‌های انبار...
                        </p>
                      ) : selectedWarehouseInventory.length === 0 ? (
                        <p className={`px-4 py-8 text-center text-sm ${theme.colors.text.muted}`}>
                          هنوز موجودی برای این انبار ثبت نشده است.
                        </p>
                      ) : filteredWarehouseInventory.length === 0 ? (
                        <p className={`px-4 py-8 text-center text-sm ${theme.colors.text.muted}`}>
                          نتیجه‌ای برای «{warehouseSearchQuery}» یافت نشد.
                        </p>
                      ) : (
                        filteredWarehouseInventory.map((item) => (
                          <div
                            key={item.id || item.code}
                            className="grid grid-cols-[1.4fr_0.5fr_0.8fr] gap-3 px-4 py-4 text-sm"
                          >
                            <span className="font-bold leading-7 text-slate-800">
                              {item.title || "-"}
                            </span>
                            <span className="font-bold text-slate-800">
                              {item.quantity}
                            </span>
                            <span className="break-all font-mono text-slate-800">
                              {item.code || "-"}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <section className="space-y-5">
              {(inventoryMessage || inventoryError) && (
                <div
                  className={`rounded-md px-4 py-3 text-sm font-bold ${
                    inventoryError
                      ? "border border-red-200 bg-red-50 text-red-700"
                      : "border border-emerald-200 bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {inventoryError || inventoryMessage}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
                <div>
                  <h3
                    className={`text-base font-bold ${theme.colors.text.primary}`}
                  >
                    انبارها
                  </h3>
                  <p className={`mt-1 text-sm ${theme.colors.text.muted}`}>
                    {warehouses.length.toLocaleString("fa-IR")} انبار ثبت شده
                    است.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={openInventoryPopup}
                    disabled={warehousesLoading || warehouses.length === 0}
                    className="rounded-md bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    بروزرسانی موجودی
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreateBoxOpen((isOpen) => !isOpen)}
                    className="rounded-md bg-slate-800 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-slate-700"
                  >
                    ایجاد انبار
                  </button>
                </div>
              </div>

              {isCreateBoxOpen && (
                <form
                  onSubmit={handleCreateWarehouse}
                  className="rounded-md border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <label
                    htmlFor="warehouse-name"
                    className={`block text-sm font-bold ${theme.colors.text.primary}`}
                  >
                    نام انبار
                  </label>
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                    <input
                      id="warehouse-name"
                      type="text"
                      value={warehouseName}
                      onChange={(event) => setWarehouseName(event.target.value)}
                      placeholder="نام انبار را وارد کنید"
                      className="min-h-11 flex-1 rounded-md border border-slate-300 bg-white px-3 text-right text-sm text-slate-800 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                    />
                    <button
                      type="submit"
                      disabled={isWarehouseCreating}
                      className="min-h-11 rounded-md bg-amber-500 px-5 text-sm font-bold text-slate-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isWarehouseCreating ? "در حال ساخت..." : "ساخت"}
                    </button>
                  </div>
                </form>
              )}

              <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
                <div className="hidden grid-cols-[1fr_0.8fr] border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 sm:grid">
                  <span>نام انبار</span>
                  <span>آیتم‌ها</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {warehousesLoading && warehouses.length === 0 ? (
                    <p className={`px-4 py-8 text-center text-sm ${theme.colors.text.muted}`}>
                      در حال دریافت انبارها...
                    </p>
                  ) : warehouses.length === 0 ? (
                    <p className={`px-4 py-8 text-center text-sm ${theme.colors.text.muted}`}>
                      انباری برای نمایش وجود ندارد.
                    </p>
                  ) : (
                    warehouses.map((warehouse) => {
                      const warehouseId = getWarehouseId(warehouse);

                      return (
                        <div
                          key={warehouseId}
                          className="grid grid-cols-1 gap-3 px-4 py-4 text-right text-sm transition-colors hover:bg-slate-50 sm:grid-cols-[1fr_0.8fr_auto] sm:items-center"
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedWarehouseDetailsId(warehouseId)}
                            className="text-right font-bold text-slate-800"
                          >
                            {warehouse.name}
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedWarehouseDetailsId(warehouseId)}
                            className="text-right text-sm font-bold text-slate-700"
                          >
                            {(
                              warehouse.itemsCount ??
                              warehouse.productsCount ??
                              inventories[warehouseId]?.items?.length ??
                              0
                            ).toLocaleString("fa-IR")}
                          </button>
                          <button
                            type="button"
                            disabled
                            className="cursor-not-allowed rounded-md border border-slate-200 px-3 py-2 text-sm font-bold text-slate-400"
                          >
                            حذف تعریف نشده
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </section>
          )}
        </main>
      </div>

      {isInventoryPopupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <button
            type="button"
            aria-label="بستن پنجره بروزرسانی موجودی"
            className="absolute inset-0 bg-slate-950/45"
            onClick={closeInventoryPopup}
          />
          <form
            onSubmit={handleInventoryUpdate}
            className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-md border border-slate-200 bg-white p-5 shadow-2xl"
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <h3 className={`text-base font-bold ${theme.colors.text.primary}`}>
                بروزرسانی موجودی
              </h3>
              <button
                type="button"
                onClick={closeInventoryPopup}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-bold text-slate-700 hover:bg-slate-100"
              >
                بستن
              </button>
            </div>

            {inventoryError && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
                {inventoryError}
              </div>
            )}
            {inventoryMessage && (
              <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">
                {inventoryMessage}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="inventory-file"
                  className={`block text-sm font-bold ${theme.colors.text.primary}`}
                >
                  فایل XLS
                </label>
                <input
                  id="inventory-file"
                  type="file"
                  accept=".xls,.xlsx"
                  onChange={(event) =>
                    setInventoryFile(event.target.files?.[0] || null)
                  }
                  className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:ml-3 file:rounded-md file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:text-sm file:font-bold file:text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="inventory-warehouse"
                  className={`block text-sm font-bold ${theme.colors.text.primary}`}
                >
                  انتخاب انبار
                </label>
                <select
                  id="inventory-warehouse"
                  value={selectedWarehouseId}
                  onChange={(event) => setSelectedWarehouseId(event.target.value)}
                  className="mt-2 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-right text-sm text-slate-800 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                >
                  {warehouses.map((warehouse) => {
                    const warehouseId = getWarehouseId(warehouse);

                    return (
                      <option key={warehouseId} value={warehouseId}>
                        {warehouse.name}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {inventoryUploadDetails && (
              <div className="mt-5 space-y-4 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                  <div>
                    <span className="block text-xs text-slate-500">
                      کل ردیف‌ها
                    </span>
                    <span className="font-bold">
                      {Number(
                        inventoryUploadDetails.totalRows || 0,
                      ).toLocaleString("fa-IR")}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs text-slate-500">
                      ردیف معتبر
                    </span>
                    <span className="font-bold text-emerald-700">
                      {Number(
                        inventoryUploadDetails.validRows || 0,
                      ).toLocaleString("fa-IR")}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs text-slate-500">
                      ردیف خراب
                    </span>
                    <span className="font-bold text-red-700">
                      {Number(
                        inventoryUploadDetails.invalidRows || 0,
                      ).toLocaleString("fa-IR")}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs text-slate-500">
                      پیدا شده
                    </span>
                    <span className="font-bold">
                      {Number(
                        inventoryUploadDetails.matched || 0,
                      ).toLocaleString("fa-IR")}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs text-slate-500">
                      پیدا نشده
                    </span>
                    <span className="font-bold">
                      {Number(
                        inventoryUploadDetails.unmatched || 0,
                      ).toLocaleString("fa-IR")}
                    </span>
                  </div>
                </div>

                {Array.isArray(
                  inventoryUploadDetails.zeroOrNegativeQuantityProducts,
                ) &&
                  inventoryUploadDetails.zeroOrNegativeQuantityProducts.length >
                    0 && (
                    <div>
                      <h4 className="mb-2 font-bold text-amber-700">
                        محصولات با موجودی صفر یا منفی
                      </h4>
                      <div className="overflow-x-auto rounded-md border border-amber-200 bg-white">
                        <div className="min-w-[640px] divide-y divide-amber-100">
                          {inventoryUploadDetails.zeroOrNegativeQuantityProducts.map(
                            (product, index) => (
                              <div
                                key={`${product.productCode || product.row}-${index}`}
                                className="grid grid-cols-[80px_1fr_140px_100px] gap-3 px-3 py-2"
                              >
                                <span>
                                  ردیف{" "}
                                  {product.row?.toLocaleString?.("fa-IR") ||
                                    product.row}
                                </span>
                                <span className="font-bold">
                                  {product.title || "-"}
                                </span>
                                <span className="font-mono">
                                  {product.productCode || "-"}
                                </span>
                                <span className="font-bold text-amber-700">
                                  {Number(product.quantity || 0).toLocaleString(
                                    "fa-IR",
                                  )}
                                </span>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                {Array.isArray(inventoryUploadDetails.errors) &&
                  inventoryUploadDetails.errors.length > 0 && (
                    <div>
                      <h4 className="mb-2 font-bold text-red-700">
                        ردیف‌های خراب
                      </h4>
                      <div className="overflow-x-auto rounded-md border border-red-200 bg-white">
                        <div className="min-w-[720px] divide-y divide-red-100">
                          {inventoryUploadDetails.errors.map((rowError, index) => (
                            <div
                              key={`${rowError.productCode || rowError.row}-${index}`}
                              className="grid grid-cols-[80px_1fr_140px_1.2fr] gap-3 px-3 py-2"
                            >
                              <span>
                                ردیف{" "}
                                {rowError.row?.toLocaleString?.("fa-IR") ||
                                  rowError.row}
                              </span>
                              <span className="font-bold">
                                {rowError.title || "-"}
                              </span>
                              <span className="font-mono">
                                {rowError.productCode || "-"}
                              </span>
                              <span className="text-red-700">
                                {translateWarehouseUploadError(rowError.message)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={
                  !inventoryFile || !selectedWarehouseId || isInventorySaving
                }
                className="rounded-md bg-amber-500 px-5 py-2.5 text-sm font-bold text-slate-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isInventorySaving ? "در حال ذخیره..." : "بروزرسانی"}
              </button>
            </div>
          </form>
        </div>
      )}

      {warehouseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <button
            type="button"
            aria-label="بستن پنجره حذف انبار"
            className="absolute inset-0 bg-slate-950/45"
            onClick={closeDeleteWarehousePopup}
          />
          <div className="relative w-full max-w-md rounded-md border border-slate-200 bg-white p-5 shadow-2xl">
            <h3 className={`text-base font-bold ${theme.colors.text.primary}`}>
              حذف انبار
            </h3>
            <p className={`mt-3 text-sm leading-7 ${theme.colors.text.muted}`}>
              آیا از حذف انبار «{warehouseToDelete.name}» مطمئن هستید؟ موجودی ذخیره‌شده این انبار هم حذف می‌شود.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={closeDeleteWarehousePopup}
                className="rounded-md border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={confirmDeleteWarehouse}
                className="rounded-md bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-500"
              >
                حذف انبار
              </button>
            </div>
          </div>
        </div>
      )}

      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <button
            type="button"
            aria-label="بستن پنجره حذف کاربر"
            className="absolute inset-0 bg-slate-950/45"
            onClick={closeDeleteUserPopup}
          />
          <div className="relative w-full max-w-md rounded-md border border-slate-200 bg-white p-5 shadow-2xl">
            <h3 className={`text-base font-bold ${theme.colors.text.primary}`}>
              حذف کاربر
            </h3>
            <p className={`mt-3 text-sm leading-7 ${theme.colors.text.muted}`}>
              آیا از حذف کاربر «
              {userToDelete.phoneNumber || userToDelete.username || "بدون شماره"}
              » مطمئن هستید؟
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={closeDeleteUserPopup}
                disabled={isDeletingUser}
                className="rounded-md border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={confirmDeleteUser}
                disabled={isDeletingUser}
                className="rounded-md bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDeletingUser ? "در حال حذف..." : "حذف کاربر"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
