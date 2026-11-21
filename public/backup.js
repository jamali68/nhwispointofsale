// ============================================
// 💾 EASY BILL GENERATOR — ADVANCED BACKUP, RESTORE & SQL MIGRATION ENGINE
// ✅ Full Agency Cloud & Local JSON, SQL Dump, Multi-Sheet Excel (.XLS), Master CSV & HTML Audit Export
// ✅ Universal SQL Parser & Converter (MySQL / PostgreSQL / SQLite / Legacy POS .SQL -> NH POS Cloud)
// ✅ Universal CSV / Excel Importer with Smart Column Auto-Mapping
// ✅ Strict Mix-Fix Per-Category Isolation & Sub-Agency Switcher Support
// ✅ Safe Batch Writes to Firestore (400-doc chunks, Merge vs Clean Overwrite)
// ============================================

const firebaseConfig = {
    apiKey: "AIzaSyDDwKWcixoUThCJQqiVoBcUVsJZI60h43Q",
    authDomain: "multipos-ed91a.firebaseapp.com",
    projectId: "multipos-ed91a",
    storageBucket: "multipos-ed91a.firebasestorage.app",
    messagingSenderId: "862649586987",
    appId: "1:862649586987:web:599772124e4e29404ca16e",
    measurementId: "G-QPCP7S5Q5L"
};

if (typeof firebase !== 'undefined' && (!firebase.apps || !firebase.apps.length)) {
    firebase.initializeApp(firebaseConfig);
}
const auth = typeof firebase !== 'undefined' ? firebase.auth() : null;
const db = typeof firebase !== 'undefined' ? firebase.firestore() : null;

// Global State
let myUid = null;
let myUser = null;
let myAgencyId = null;
let myAgency = null;

let allStock = [];
let allCustomers = [];
let allBills = [];
let allMovements = [];
let allOrders = [];
let allExpenses = [];
let allExpenseCategories = [];
let allPayrollProfiles = [];
let allStockReturns = [];
let allDamageClaims = [];
let lastStudioParsedPayload = null;

const BACKUP_COLLECTIONS = [
    'stock',
    'customers',
    'bills',
    'movements',
    'orders',
    'expenses',
    'expense_categories',
    'staff_payroll_profiles',
    'stock_returns',
    'damage_claims'
];

function getActiveBackupCategory(agencyObj = myAgency) {
    if (typeof window !== 'undefined' && window.BusinessCategories && typeof window.BusinessCategories.resolveActiveCategory === 'function') {
        return window.BusinessCategories.resolveActiveCategory(agencyObj, 'general');
    }
    return (agencyObj && (agencyObj.businessCategory || agencyObj.businessType))
        || (typeof localStorage !== 'undefined' && (localStorage.getItem('eb_active_business_category') || localStorage.getItem('eb_active_category')))
        || 'general';
}

function matchesBackupActiveCategory(rec, activeCat = getActiveBackupCategory(), agencyObj = myAgency) {
    if (!rec || typeof rec !== 'object') return false;
    if (typeof window !== 'undefined' && window.BusinessCategories && typeof window.BusinessCategories.matchesActiveCategoryRecord === 'function') {
        return window.BusinessCategories.matchesActiveCategoryRecord(rec, activeCat, agencyObj);
    }
    const recCat = rec.businessCategory || rec.categoryType || '';
    if (!recCat) return activeCat === 'general';
    return recCat === activeCat;
}

function buildAgencyBackupPayload(agencyId, agencyData, collections = {}, explicitCategoryId = '') {
    const activeCat = explicitCategoryId || getActiveBackupCategory(agencyData);
    const catLabel = (typeof window !== 'undefined' && window.BusinessCategories && typeof window.BusinessCategories.getLabel === 'function')
        ? window.BusinessCategories.getLabel(activeCat)
        : activeCat;
    const safeCol = (k) => Array.isArray(collections[k]) ? collections[k] : [];
    const stock = safeCol('stock');
    const customers = safeCol('customers');
    const bills = safeCol('bills');
    const movements = safeCol('movements');
    const orders = safeCol('orders');
    const expenses = safeCol('expenses');
    const expense_categories = safeCol('expense_categories');
    const staff_payroll_profiles = safeCol('staff_payroll_profiles');
    const stock_returns = safeCol('stock_returns');
    const damage_claims = safeCol('damage_claims');

    return {
        app: 'NH POS',
        formatVersion: '2.1',
        exportDate: new Date().toISOString(),
        agencyId: agencyId || '',
        agencyName: (agencyData && agencyData.name) || 'Agency',
        businessCategory: activeCat,
        categoryLabel: catLabel,
        summary: {
            stockItems: stock.length,
            customers: customers.length,
            bills: bills.length,
            movements: movements.length,
            orders: orders.length,
            expenses: expenses.length,
            expenseCategories: expense_categories.length,
            payrollProfiles: staff_payroll_profiles.length,
            stockReturns: stock_returns.length,
            damageClaims: damage_claims.length
        },
        data: {
            agency: agencyData || {},
            stock,
            customers,
            bills,
            movements,
            orders,
            expenses,
            expense_categories,
            staff_payroll_profiles,
            stock_returns,
            damage_claims
        }
    };
}

function validateBackupPayload(parsed) {
    if (!parsed || typeof parsed !== 'object' || !parsed.app || !parsed.data || typeof parsed.data !== 'object') {
        return { valid: false, reason: 'Invalid NH POS backup header or data section' };
    }
    const d = parsed.data;
    const counts = {};
    let totalDocs = 0;
    BACKUP_COLLECTIONS.forEach(col => {
        const len = Array.isArray(d[col]) ? d[col].length : 0;
        counts[col] = len;
        totalDocs += len;
    });
    return {
        valid: true,
        formatVersion: String(parsed.formatVersion || '1.0'),
        agencyName: parsed.agencyName || 'Agency',
        businessCategory: parsed.businessCategory || '',
        counts,
        totalDocs
    };
}

// ============================================
// 🗄️ UNIVERSAL SQL GENERATOR & SQL / CSV PARSER ENGINE
// ============================================

function sqlEscapeValue(val) {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'number') return Number.isFinite(val) ? String(val) : '0';
    if (typeof val === 'boolean') return val ? '1' : '0';
    if (typeof val === 'object') {
        const json = JSON.stringify(val)
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "''")
            .replace(/\r/g, '\\r')
            .replace(/\n/g, '\\n');
        return `'${json}'`;
    }
    const str = String(val)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "''")
        .replace(/\r/g, '\\r')
        .replace(/\n/g, '\\n');
    return `'${str}'`;
}

const SQL_COLLECTION_COLUMNS = {
    stock: ['id', 'name', 'brandCompany', 'category', 'barcode', 'qty', 'unit', 'purchaseRate', 'wholesaleRate', 'retailRate', 'tradePriceTP', 'cartonPacking', 'bonusSchemeRule', 'skuBatchCode', 'expiryDate', 'lowStockLimit', 'businessCategory', 'raw_json'],
    customers: ['id', 'name', 'shopName', 'mobile', 'custSubCategory', 'affiliatedBoard', 'address', 'balance', 'creditLimit', 'businessCategory', 'raw_json'],
    bills: ['id', 'billNo', 'date', 'customerId', 'customerName', 'grandTotal', 'received', 'paidAmount', 'balance', 'paymentMode', 'bookerName', 'businessCategory', 'raw_json'],
    orders: ['id', 'orderNo', 'date', 'customerId', 'customerName', 'grandTotal', 'status', 'bookerName', 'businessCategory', 'raw_json'],
    expenses: ['id', 'date', 'categoryId', 'categoryName', 'title', 'staffName', 'amount', 'paymentMode', 'payrollMonth', 'businessCategory', 'raw_json'],
    expense_categories: ['id', 'name', 'type', 'businessCategory', 'raw_json'],
    staff_payroll_profiles: ['id', 'name', 'role', 'mobile', 'baseSalary', 'commissionPct', 'monthlyTarget', 'businessCategory', 'raw_json'],
    stock_returns: ['id', 'returnNo', 'date', 'customerName', 'itemName', 'qty', 'totalAmount', 'reason', 'businessCategory', 'raw_json'],
    damage_claims: ['id', 'voucherNo', 'incidentDate', 'itemName', 'supplierName', 'category', 'qty', 'totalLoss', 'recoveredAmount', 'status', 'businessCategory', 'raw_json'],
    movements: ['id', 'date', 'itemId', 'itemName', 'type', 'qty', 'note', 'businessCategory', 'raw_json']
};

function generateAgencySQLDump(backupPayload) {
    if (!backupPayload || !backupPayload.data) return '-- Empty Backup Payload';
    const d = backupPayload.data;
    const activeCat = backupPayload.businessCategory || 'general';
    const agencyName = backupPayload.agencyName || 'Agency';
    const lines = [
        `-- ============================================================================`,
        `-- 🗄️ NH POS UNIVERSAL SQL DATABASE DUMP (v2.1)`,
        `-- Agency: ${agencyName} (${backupPayload.agencyId || 'local'})`,
        `-- Business Category: ${activeCat} (${backupPayload.categoryLabel || activeCat})`,
        `-- Export Timestamp: ${backupPayload.exportDate || new Date().toISOString()}`,
        `-- Compatible with: MySQL, PostgreSQL, SQLite, MariaDB & NH POS SQL Importer`,
        `-- ============================================================================`,
        ``
    ];

    BACKUP_COLLECTIONS.forEach(col => {
        const rows = Array.isArray(d[col]) ? d[col] : [];
        const cols = SQL_COLLECTION_COLUMNS[col] || ['id', 'name', 'businessCategory', 'raw_json'];
        const colDefs = cols.map((c, idx) => {
            if (idx === 0) return `\`${c}\` VARCHAR(120) PRIMARY KEY`;
            if (c === 'raw_json') return `\`${c}\` LONGTEXT`;
            if (['qty', 'purchaseRate', 'wholesaleRate', 'retailRate', 'tradePriceTP', 'lowStockLimit', 'balance', 'creditLimit', 'grandTotal', 'received', 'paidAmount', 'amount', 'baseSalary', 'commissionPct', 'monthlyTarget', 'totalAmount', 'totalLoss', 'recoveredAmount'].includes(c)) {
                return `\`${c}\` DECIMAL(14,2) DEFAULT 0`;
            }
            return `\`${c}\` TEXT`;
        });

        lines.push(`-- --------------------------------------------------------`);
        lines.push(`-- Table structure for \`${col}\` (${rows.length} records)`);
        lines.push(`-- --------------------------------------------------------`);
        lines.push(`CREATE TABLE IF NOT EXISTS \`${col}\` (${colDefs.join(', ')});`);

        rows.forEach((row, rIdx) => {
            const ind = (row && row.industryFields) || {};
            const vals = cols.map(c => {
                if (c === 'raw_json') return sqlEscapeValue(JSON.stringify(row));
                if (c === 'id') return sqlEscapeValue(row.id || `${col}_${rIdx + 1}`);
                if (c === 'businessCategory') return sqlEscapeValue(row.businessCategory || activeCat);
                const val = row[c] !== undefined ? row[c] : ind[c];
                return sqlEscapeValue(val !== undefined ? val : '');
            });
            const colNamesSql = cols.map(c => `\`${c}\``).join(', ');
            lines.push(`INSERT INTO \`${col}\` (${colNamesSql}) VALUES (${vals.join(', ')});`);
        });
        lines.push(``);
    });

    return lines.join('\n');
}

// Map arbitrary SQL table names to NH POS collections
function resolveTargetCollectionFromTableName(rawTableName = '', colNames = [], defaultHint = 'auto') {
    const t = String(rawTableName || '').toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (BACKUP_COLLECTIONS.includes(t)) return t;

    if (/^(stock|product|products|item|items|inventory|medicine|medicines|books|book|sku|skus|goods|catalog)/.test(t)) return 'stock';
    if (/^(customer|customers|client|clients|party|parties|khata|shop|shops|debtor|debtors|buyer|buyers)/.test(t)) return 'customers';
    if (/^(bill|bills|invoice|invoices|sale|sales|pos_sales|sale_invoice|transactions)/.test(t)) return 'bills';
    if (/^(order|orders|booker_orders|kot|dispatch|purchase_order|po)/.test(t)) return 'orders';
    if (/^(expense|expenses|voucher|vouchers|daily_expense|cost|costs|petty_cash)/.test(t)) return 'expenses';
    if (/^(expense_categories|expense_cat|expense_types)/.test(t)) return 'expense_categories';
    if (/^(staff|staff_payroll_profiles|employee|employees|payroll|salary|salaries|booker|bookers|waiters|salesmen|users)/.test(t)) return 'staff_payroll_profiles';
    if (/^(stock_returns|return|returns|sale_return|sales_returns|credit_note)/.test(t)) return 'stock_returns';
    if (/^(damage_claims|damage|damages|claim|claims|expiry|expired|wastage)/.test(t)) return 'damage_claims';
    if (/^(movement|movements|stock_log|stock_logs|inventory_log)/.test(t)) return 'movements';

    // If defaultHint is explicitly chosen by user (not 'auto'), use it
    if (defaultHint && defaultHint !== 'auto' && BACKUP_COLLECTIONS.includes(defaultHint)) {
        return defaultHint;
    }

    // Heuristic by column headers
    const lowerCols = colNames.map(c => String(c).toLowerCase());
    if (lowerCols.some(c => ['purchaserate', 'retailrate', 'cost_price', 'sale_price', 'mrp', 'tradepricetp', 'barcode', 'stock_qty', 'expirydate'].includes(c))) {
        return 'stock';
    }
    if (lowerCols.some(c => ['shopname', 'shop_name', 'creditlimit', 'affiliatedboard', 'weeklyroutepjp', 'opening_balance', 'custsubcategory'].includes(c))) {
        return 'customers';
    }
    if (lowerCols.some(c => ['billno', 'bill_no', 'invoice_no', 'grandtotal', 'billamount'].includes(c))) {
        return 'bills';
    }
    if (lowerCols.some(c => ['voucherno', 'totalloss', 'incidentdate', 'recoveredamount'].includes(c))) {
        return 'damage_claims';
    }
    if (lowerCols.some(c => ['basesalary', 'commissionpct', 'monthlytarget'].includes(c))) {
        return 'staff_payroll_profiles';
    }
    if (lowerCols.some(c => ['payrollmonth', 'categoryname', 'expense_amount'].includes(c))) {
        return 'expenses';
    }
    if (lowerCols.some(c => ['mobile', 'phone', 'contact', 'balance'].includes(c))) {
        return 'customers';
    }
    return 'stock';
}

// Normalize arbitrary SQL/CSV row fields into NH POS collection document format
function normalizeImportedRecord(rawObj, targetCol, activeCat = 'general', idx = 0) {
    if (!rawObj || typeof rawObj !== 'object') return null;

    // 1. If the row has raw_json from NH POS SQL dump, parse and merge it!
    if (rawObj.raw_json && typeof rawObj.raw_json === 'string' && rawObj.raw_json.trim().startsWith('{')) {
        try {
            const restored = JSON.parse(rawObj.raw_json);
            restored.businessCategory = restored.businessCategory || activeCat;
            restored.categoryConfirmedByCreate = true;
            return restored;
        } catch (_) {}
    }

    // Build case-insensitive lookup
    const map = {};
    Object.keys(rawObj).forEach(k => {
        const cleanKey = String(k).trim();
        map[cleanKey.toLowerCase().replace(/[^a-z0-9]/g, '')] = rawObj[k];
    });

    const pickStr = (...keys) => {
        for (const k of keys) {
            const lk = k.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (map[lk] !== undefined && map[lk] !== null && String(map[lk]).trim() !== '' && String(map[lk]).toUpperCase() !== 'NULL') {
                return String(map[lk]).trim();
            }
        }
        return '';
    };

    const pickNum = (...keys) => {
        for (const k of keys) {
            const lk = k.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (map[lk] !== undefined && map[lk] !== null && String(map[lk]).trim() !== '' && String(map[lk]).toUpperCase() !== 'NULL') {
                const cleaned = String(map[lk]).replace(/[^0-9.-]/g, '');
                const n = parseFloat(cleaned);
                if (Number.isFinite(n)) return n;
            }
        }
        return 0;
    };

    const id = pickStr('id', 'doc_id', 'uid', 'code', 'item_id', 'product_id', 'customer_id', 'bill_id') || `imp_${targetCol}_${Date.now()}_${idx + 1}`;
    const today = new Date().toISOString().slice(0, 10);

    if (targetCol === 'stock') {
        const name = pickStr('name', 'product_name', 'item_name', 'title', 'medicine_name', 'book_title', 'description', 'item') || `Imported Item #${idx + 1}`;
        const brandCompany = pickStr('brandcompany', 'brand', 'company', 'manufacturer', 'publisher', 'supplier', 'suppliername', 'principal');
        const category = pickStr('category', 'group', 'sub_category', 'type', 'department') || 'General';
        const barcode = pickStr('barcode', 'sku', 'item_code', 'product_code', 'isbn', 'imei');
        const qty = pickNum('qty', 'quantity', 'stock', 'stock_qty', 'opening_stock', 'qoh', 'available_qty');
        const unit = pickStr('unit', 'uom', 'packing_unit') || 'Pcs';
        const purchaseRate = pickNum('purchaserate', 'cost', 'cost_price', 'buy_price', 'purchase_price', 'unit_cost', 'rate');
        const tradePriceTP = pickNum('tradepricetp', 'wholesalerate', 'trade_price', 'tp', 'wholesale_price', 'dealer_price') || purchaseRate;
        const retailRate = pickNum('retailrate', 'sale_price', 'selling_price', 'mrp', 'retail_price', 'price', 'unit_price') || tradePriceTP || purchaseRate;
        const cartonPacking = pickStr('cartonpacking', 'packing', 'pack_size', 'box_size');
        const bonusSchemeRule = pickStr('bonusschemerule', 'scheme', 'bonus', 'free_scheme');
        const skuBatchCode = pickStr('skubatchcode', 'batchno', 'batch_no', 'batch', 'lot_no');
        const expiryDate = pickStr('expirydate', 'expiry', 'exp_date', 'expire_date');
        const lowStockLimit = pickNum('lowstocklimit', 'min_stock', 'reorder_level', 'alert_qty') || 5;

        return {
            id,
            name,
            brandCompany,
            supplierName: brandCompany,
            category,
            barcode,
            qty,
            unit,
            purchaseRate,
            wholesaleRate: tradePriceTP,
            tradePriceTP,
            retailRate,
            cartonPacking,
            bonusSchemeRule,
            skuBatchCode,
            batchNo: skuBatchCode,
            expiryDate,
            lowStockLimit,
            industryFields: {
                brandCompany,
                cartonPacking,
                tradePriceTP,
                bonusSchemeRule,
                skuBatchCode,
                expiryDate
            },
            businessCategory: activeCat,
            categoryConfirmedByCreate: true,
            updatedAt: new Date().toISOString()
        };
    }

    if (targetCol === 'customers') {
        const name = pickStr('name', 'customer_name', 'client_name', 'party_name', 'person_name', 'owner_name', 'customer') || `Customer #${idx + 1}`;
        const shopName = pickStr('shopname', 'shop_name', 'business_name', 'company_name', 'store_name', 'firm_name') || name;
        const mobile = pickStr('mobile', 'phone', 'contact', 'cell', 'phone_no', 'mobile_no', 'tel');
        const custSubCategory = pickStr('custsubcategory', 'segment', 'subcategory', 'customer_type', 'type') || 'Retailer';
        const affiliatedBoard = pickStr('affiliatedboard', 'weeklyroutepjp', 'route', 'area', 'city', 'zone', 'market');
        const address = pickStr('address', 'location', 'street', 'shop_address');
        const balance = pickNum('balance', 'opening_balance', 'current_balance', 'due', 'due_amount', 'khata_balance', 'debit');
        const creditLimit = pickNum('creditlimit', 'credit_limit', 'limit');

        return {
            id,
            name,
            shopName,
            mobile,
            custSubCategory,
            subCategory: custSubCategory,
            affiliatedBoard,
            route: affiliatedBoard,
            address,
            balance,
            creditLimit,
            businessCategory: activeCat,
            categoryConfirmedByCreate: true,
            updatedAt: new Date().toISOString()
        };
    }

    if (targetCol === 'bills') {
        const billNo = pickStr('billno', 'bill_no', 'invoice_no', 'inv_no', 'receipt_no', 'voucher_no') || `INV-${1000 + idx}`;
        const date = pickStr('date', 'bill_date', 'invoice_date', 'sale_date', 'created_at').slice(0, 10) || today;
        const customerName = pickStr('customername', 'customer', 'client_name', 'party_name', 'shop_name') || 'Walk-in Customer';
        const grandTotal = pickNum('grandtotal', 'total', 'billamount', 'net_total', 'total_amount', 'amount', 'sale_amount');
        const received = pickNum('received', 'paidamount', 'paid', 'cash_received', 'collected');
        const balance = pickNum('balance', 'due', 'remaining', 'credit_amount') || Math.max(0, grandTotal - received);

        return {
            id,
            billNo,
            date,
            customerName,
            grandTotal,
            billAmount: grandTotal,
            received,
            paidAmount: received,
            balance,
            paymentMode: pickStr('paymentmode', 'payment_method', 'mode') || (balance > 0 ? 'credit' : 'cash'),
            bookerName: pickStr('bookername', 'booker', 'salesman', 'waiter', 'staff'),
            items: [],
            businessCategory: activeCat,
            categoryConfirmedByCreate: true
        };
    }

    if (targetCol === 'orders') {
        const orderNo = pickStr('orderno', 'order_no', 'kot_no', 'po_no') || `ORD-${1000 + idx}`;
        const date = pickStr('date', 'order_date', 'created_at').slice(0, 10) || today;
        const customerName = pickStr('customername', 'customer', 'shop_name', 'table_no') || 'Order Customer';
        const grandTotal = pickNum('grandtotal', 'total', 'amount', 'order_total');
        return {
            id,
            orderNo,
            date,
            customerName,
            grandTotal,
            status: pickStr('status', 'order_status') || 'dispatched',
            bookerName: pickStr('bookername', 'booker', 'waiter', 'salesman'),
            items: [],
            businessCategory: activeCat,
            categoryConfirmedByCreate: true
        };
    }

    if (targetCol === 'expenses') {
        const date = pickStr('date', 'expense_date', 'voucher_date', 'created_at').slice(0, 10) || today;
        const categoryName = pickStr('categoryname', 'category', 'expense_type', 'head', 'account') || 'General Expense';
        const title = pickStr('title', 'description', 'note', 'particulars', 'staffname', 'name') || categoryName;
        const amount = pickNum('amount', 'expense_amount', 'total', 'paid', 'debit');
        return {
            id,
            date,
            categoryId: pickStr('categoryid') || 'cat_imported',
            categoryName,
            title,
            staffName: pickStr('staffname', 'employee_name'),
            amount,
            paymentMode: pickStr('paymentmode', 'mode') || 'cash',
            payrollMonth: pickStr('payrollmonth', 'month'),
            businessCategory: activeCat,
            categoryConfirmedByCreate: true
        };
    }

    if (targetCol === 'staff_payroll_profiles') {
        const name = pickStr('name', 'staff_name', 'employee_name', 'full_name', 'username') || `Staff #${idx + 1}`;
        return {
            id,
            name,
            role: pickStr('role', 'designation', 'position', 'job_title') || 'booker',
            mobile: pickStr('mobile', 'phone', 'contact'),
            baseSalary: pickNum('basesalary', 'salary', 'basic_pay', 'monthly_salary'),
            commissionPct: pickNum('commissionpct', 'commission', 'comm_pct'),
            monthlyTarget: pickNum('monthlytarget', 'target', 'sales_target'),
            businessCategory: activeCat,
            categoryConfirmedByCreate: true
        };
    }

    if (targetCol === 'damage_claims') {
        const totalLoss = pickNum('totalloss', 'lossamount', 'loss', 'amount', 'claim_amount');
        return {
            id,
            voucherNo: pickStr('voucherno', 'claim_no', 'voucher') || `CLM-${100 + idx}`,
            incidentDate: pickStr('incidentdate', 'date', 'claim_date').slice(0, 10) || today,
            itemName: pickStr('itemname', 'product_name', 'name', 'item') || 'Damaged Item',
            supplierName: pickStr('suppliername', 'supplier', 'company', 'brand'),
            category: pickStr('category', 'reason', 'damage_type') || 'Expired / Damaged',
            qty: pickNum('qty', 'quantity') || 1,
            totalLoss,
            lossAmount: totalLoss,
            recoveredAmount: pickNum('recoveredamount', 'recovered', 'settled_amount'),
            status: pickStr('status', 'claim_status') || 'pending',
            businessCategory: activeCat,
            categoryConfirmedByCreate: true
        };
    }

    if (targetCol === 'stock_returns') {
        return {
            id,
            returnNo: pickStr('returnno', 'return_no', 'voucher_no') || `RET-${100 + idx}`,
            date: pickStr('date', 'return_date').slice(0, 10) || today,
            customerName: pickStr('customername', 'customer', 'party_name') || 'Customer',
            itemName: pickStr('itemname', 'product_name', 'item') || 'Returned Item',
            qty: pickNum('qty', 'quantity') || 1,
            totalAmount: pickNum('totalamount', 'amount', 'total'),
            reason: pickStr('reason', 'note') || 'Sales Return',
            businessCategory: activeCat,
            categoryConfirmedByCreate: true
        };
    }

    if (targetCol === 'movements') {
        return {
            id,
            date: pickStr('date', 'created_at').slice(0, 10) || today,
            itemId: pickStr('itemid', 'product_id'),
            itemName: pickStr('itemname', 'product_name', 'name') || 'Stock Item',
            type: pickStr('type', 'movement_type', 'action') || 'IN',
            qty: pickNum('qty', 'quantity'),
            note: pickStr('note', 'remarks', 'reference'),
            businessCategory: activeCat,
            categoryConfirmedByCreate: true
        };
    }

    // Default generic record
    return {
        ...rawObj,
        id,
        businessCategory: activeCat,
        categoryConfirmedByCreate: true
    };
}

// Parse SQL VALUES tuples safely (handles quotes, escaped quotes, NULL, numbers, nested parens)
function parseSQLValueTuples(valuesBody) {
    const tuples = [];
    let i = 0;
    const len = valuesBody.length;

    while (i < len) {
        while (i < len && valuesBody[i] !== '(') i++;
        if (i >= len) break;
        i++; // skip '('

        const row = [];
        let cur = '';
        let inQuote = null;
        let wasQuoted = false;
        let depth = 0;

        while (i < len) {
            const ch = valuesBody[i];

            if (inQuote) {
                if (ch === '\\' && i + 1 < len) {
                    const next = valuesBody[i + 1];
                    if (next === 'n') cur += '\n';
                    else if (next === 'r') cur += '\r';
                    else if (next === 't') cur += '\t';
                    else cur += next;
                    i += 2;
                    continue;
                }
                if (ch === inQuote) {
                    if (valuesBody[i + 1] === inQuote) {
                        cur += inQuote;
                        i += 2;
                        continue;
                    }
                    inQuote = null;
                    i++;
                    continue;
                }
                cur += ch;
                i++;
                continue;
            }

            if (ch === "'" || ch === '"') {
                inQuote = ch;
                wasQuoted = true;
                i++;
                continue;
            }

            if (ch === '(') {
                depth++;
                cur += ch;
                i++;
                continue;
            }

            if (ch === ')') {
                if (depth > 0) {
                    depth--;
                    cur += ch;
                    i++;
                    continue;
                }
                // End of tuple
                const trimmed = cur.trim();
                if (!wasQuoted && trimmed.toUpperCase() === 'NULL') {
                    row.push(null);
                } else if (!wasQuoted && /^-?\d+(\.\d+)?$/.test(trimmed)) {
                    row.push(Number(trimmed));
                } else {
                    row.push(wasQuoted ? cur : trimmed);
                }
                i++; // skip ')'
                break;
            }

            if (ch === ',' && depth === 0) {
                const trimmed = cur.trim();
                if (!wasQuoted && trimmed.toUpperCase() === 'NULL') {
                    row.push(null);
                } else if (!wasQuoted && /^-?\d+(\.\d+)?$/.test(trimmed)) {
                    row.push(Number(trimmed));
                } else {
                    row.push(wasQuoted ? cur : trimmed);
                }
                cur = '';
                wasQuoted = false;
                i++;
                continue;
            }

            cur += ch;
            i++;
        }

        if (row.length > 0) {
            tuples.push(row);
        }
        // stop if semicolon reached outside parens
        while (i < len && /\s/.test(valuesBody[i])) i++;
        if (valuesBody[i] === ',') {
            i++;
        } else if (valuesBody[i] === ';') {
            break;
        }
    }

    return tuples;
}

function parseSQLDumpToNHPOS(sqlText, defaultCollectionHint = 'auto', activeCat = 'general', agencyId = '', agencyData = null) {
    const cleanSQL = String(sqlText || '')
        .replace(/\/\*[\s\S]*?\*\//g, '') // strip block comments
        .replace(/^\s*--.*$/gm, '');      // strip line comments

    const tableSchemas = {}; // tableNameLower -> [col1, col2, ...]
    const collections = {};
    BACKUP_COLLECTIONS.forEach(c => { collections[c] = []; });
    const detectedTables = [];

    // 1. Extract CREATE TABLE column definitions
    const createRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"'\[]?([a-zA-Z0-9_]+)[`"'\]]?\s*\(([\s\S]*?)\)\s*(?:ENGINE[^;]*)?;/gi;
    let cMatch;
    while ((cMatch = createRegex.exec(cleanSQL)) !== null) {
        const tName = cMatch[1].toLowerCase();
        const body = cMatch[2];
        const cols = [];
        // Split top-level commas
        let depth = 0;
        let token = '';
        for (let i = 0; i < body.length; i++) {
            const ch = body[i];
            if (ch === '(') depth++;
            else if (ch === ')') depth = Math.max(0, depth - 1);
            if (ch === ',' && depth === 0) {
                cols.push(token.trim());
                token = '';
            } else {
                token += ch;
            }
        }
        if (token.trim()) cols.push(token.trim());

        const colNames = [];
        cols.forEach(line => {
            const upper = line.toUpperCase();
            if (/^(PRIMARY|KEY|UNIQUE|INDEX|CONSTRAINT|FOREIGN|CHECK)\b/.test(upper)) return;
            const m = line.match(/^[`"'\[]?([a-zA-Z0-9_]+)[`"'\]]?/);
            if (m && m[1]) colNames.push(m[1]);
        });
        if (colNames.length > 0) {
            tableSchemas[tName] = colNames;
        }
    }

    // 2. Extract INSERT INTO statements
    const insertRegex = /INSERT\s+(?:IGNORE\s+)?INTO\s+[`"'\[]?([a-zA-Z0-9_]+)[`"'\]]?\s*(\([^\)]+\))?\s*VALUES\s*([\s\S]*?);/gi;
    let iMatch;
    let totalRowsParsed = 0;

    while ((iMatch = insertRegex.exec(cleanSQL)) !== null) {
        const rawTable = iMatch[1];
        const tLower = rawTable.toLowerCase();
        const colGroup = iMatch[2];
        const valuesPart = iMatch[3];

        let colNames = [];
        if (colGroup) {
            colNames = colGroup
                .slice(1, -1)
                .split(',')
                .map(c => c.trim().replace(/^[`"'\[]|[`"'\]]$/g, ''))
                .filter(Boolean);
        } else if (tableSchemas[tLower]) {
            colNames = tableSchemas[tLower];
        }

        const tuples = parseSQLValueTuples(valuesPart);
        if (tuples.length === 0) continue;

        if (colNames.length === 0 && tuples[0]) {
            colNames = tuples[0].map((_, idx) => idx === 0 ? 'id' : idx === 1 ? 'name' : `col_${idx + 1}`);
        }

        const targetCol = resolveTargetCollectionFromTableName(rawTable, colNames, defaultCollectionHint);
        if (!detectedTables.some(t => t.sqlTable === rawTable && t.targetCollection === targetCol)) {
            detectedTables.push({ sqlTable: rawTable, targetCollection: targetCol, rows: 0, columns: colNames });
        }
        const tableMeta = detectedTables.find(t => t.sqlTable === rawTable && t.targetCollection === targetCol);

        tuples.forEach((tuple, idx) => {
            const rawObj = {};
            colNames.forEach((cName, cIdx) => {
                rawObj[cName] = tuple[cIdx] !== undefined ? tuple[cIdx] : null;
            });
            const normalized = normalizeImportedRecord(rawObj, targetCol, activeCat, collections[targetCol].length + idx);
            if (normalized) {
                collections[targetCol].push(normalized);
                totalRowsParsed++;
                if (tableMeta) tableMeta.rows++;
            }
        });
    }

    const payload = buildAgencyBackupPayload(
        agencyId || (agencyData && agencyData.id) || 'sql_migrated_agency',
        agencyData || { name: 'SQL Migrated Agency', businessCategory: activeCat },
        collections,
        activeCat
    );
    payload.sourceFormat = 'SQL';
    payload.detectedTables = detectedTables;
    payload.totalRowsParsed = totalRowsParsed;
    return payload;
}

// Parse CSV text into NH POS Backup Payload
function parseCSVLine(line) {
    const out = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQuotes) {
            if (ch === '"') {
                if (line[i + 1] === '"') {
                    cur += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                cur += ch;
            }
        } else {
            if (ch === '"') {
                inQuotes = true;
            } else if (ch === ',') {
                out.push(cur.trim());
                cur = '';
            } else {
                cur += ch;
            }
        }
    }
    out.push(cur.trim());
    return out;
}

function parseCSVToNHPOS(csvText, defaultCollectionHint = 'auto', activeCat = 'general', agencyId = '', agencyData = null) {
    const lines = String(csvText || '')
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(Boolean);

    const collections = {};
    BACKUP_COLLECTIONS.forEach(c => { collections[c] = []; });

    if (lines.length < 2) {
        const emptyPayload = buildAgencyBackupPayload(agencyId, agencyData, collections, activeCat);
        emptyPayload.sourceFormat = 'CSV';
        emptyPayload.detectedTables = [];
        emptyPayload.totalRowsParsed = 0;
        return emptyPayload;
    }

    const headers = parseCSVLine(lines[0]).map(h => h.replace(/^["']|["']$/g, '').trim());
    const hasCollectionCol = headers.some(h => h.toLowerCase() === 'nhpos_collection' || h.toLowerCase() === 'collection_type');
    const targetCol = resolveTargetCollectionFromTableName('', headers, defaultCollectionHint);

    let totalRowsParsed = 0;
    const tableCounts = {};

    for (let r = 1; r < lines.length; r++) {
        const vals = parseCSVLine(lines[r]);
        if (vals.length === 0 || (vals.length === 1 && !vals[0])) continue;
        const rawObj = {};
        headers.forEach((h, idx) => {
            rawObj[h] = vals[idx] !== undefined ? vals[idx] : '';
        });

        let rowCol = targetCol;
        if (hasCollectionCol) {
            const explicitCol = String(rawObj.NHPOS_COLLECTION || rawObj.nhpos_collection || rawObj.collection_type || '').toLowerCase().trim();
            if (BACKUP_COLLECTIONS.includes(explicitCol)) rowCol = explicitCol;
        }

        const normalized = normalizeImportedRecord(rawObj, rowCol, activeCat, collections[rowCol].length);
        if (normalized) {
            collections[rowCol].push(normalized);
            tableCounts[rowCol] = (tableCounts[rowCol] || 0) + 1;
            totalRowsParsed++;
        }
    }

    const detectedTables = Object.keys(tableCounts).map(col => ({
        sqlTable: `CSV_${col.toUpperCase()}`,
        targetCollection: col,
        rows: tableCounts[col],
        columns: headers
    }));

    const payload = buildAgencyBackupPayload(
        agencyId || (agencyData && agencyData.id) || 'csv_migrated_agency',
        agencyData || { name: 'CSV Imported Agency', businessCategory: activeCat },
        collections,
        activeCat
    );
    payload.sourceFormat = 'CSV';
    payload.detectedTables = detectedTables;
    payload.totalRowsParsed = totalRowsParsed;
    return payload;
}

if (typeof window !== 'undefined') {
    window.buildAgencyBackupPayload = buildAgencyBackupPayload;
    window.validateBackupPayload = validateBackupPayload;
    window.generateAgencySQLDump = generateAgencySQLDump;
    window.parseSQLDumpToNHPOS = parseSQLDumpToNHPOS;
    window.parseCSVToNHPOS = parseCSVToNHPOS;
}

// ============================================
// 🌐 UNIFIED BILINGUAL ENGINE (Sidebar-Controlled)
// ============================================
let studioWasCleared = false;

function ebIsMix() {
    return typeof window !== 'undefined' && Boolean(window.ebLang && typeof window.ebLang.isMix === 'function' && window.ebLang.isMix());
}

function ebT(en, ur) {
    if (!ebIsMix() || !ur) return en;
    return `${en} (${ur})`;
}

function ebMix(en, ur) {
    if (!ebIsMix() || !ur) return en;
    return `${en} <span class="eb-ur-sub">(${ur})</span>`;
}

function ebCompact(en, ur) {
    if (!ebIsMix() || !ur) return en;
    return `${en}<span class="eb-ur-compact">${ur}</span>`;
}

function ebGetCategoryLabel(catId) {
    const cat = (typeof window !== 'undefined' && window.BusinessCategories && typeof window.BusinessCategories.getById === 'function')
        ? window.BusinessCategories.getById(catId)
        : null;
    if (!cat) return ebMix(String(catId || 'General Business').toUpperCase(), 'عمومی کاروبار');
    return `${cat.icon || '💼'} ${ebMix(cat.nameEn, cat.nameUr)}`;
}

function ebGetCategoryLabelPlain(catId) {
    const cat = (typeof window !== 'undefined' && window.BusinessCategories && typeof window.BusinessCategories.getById === 'function')
        ? window.BusinessCategories.getById(catId)
        : null;
    if (!cat) return String(catId || 'General Business').toUpperCase();
    return ebIsMix() && cat.nameUr ? `${cat.icon || '💼'} ${cat.nameEn} (${cat.nameUr})` : `${cat.icon || '💼'} ${cat.nameEn}`;
}

function ebApplyBilingualDom(root) {
    if (typeof document === 'undefined') return;
    const scope = root || document;
    scope.querySelectorAll('[data-eb-en]').forEach(el => {
        const en = el.getAttribute('data-eb-en') || '';
        const ur = el.getAttribute('data-eb-ur') || '';
        const isCompact = el.getAttribute('data-eb-compact') === '1';
        el.innerHTML = isCompact ? ebCompact(en, ur) : ebMix(en, ur);
    });
    scope.querySelectorAll('[data-eb-ph-en]').forEach(el => {
        const en = el.getAttribute('data-eb-ph-en') || '';
        const ur = el.getAttribute('data-eb-ph-ur') || '';
        el.setAttribute('placeholder', ebT(en, ur));
    });
}

function ebBilingualizeSelectOptions(sel, items) {
    if (!sel || !Array.isArray(items)) return;
    const prevVal = sel.value;
    items.forEach(item => {
        const opt = Array.from(sel.options).find(o => o.value === item.value);
        if (opt) {
            opt.textContent = ebIsMix() && item.ur ? `${item.en} (${item.ur})` : item.en;
        }
    });
    if (prevVal) sel.value = prevVal;
}

function ebRefreshStaticSelects() {
    if (typeof document === 'undefined') return;
    ebBilingualizeSelectOptions(document.getElementById('importDefaultCollection'), [
        { value: 'auto', en: '🤖 Auto-Detect from Table / Columns', ur: 'خودکار شناخت' },
        { value: 'stock', en: '📦 Stock / Inventory Items', ur: 'اسٹاک / انوینٹری' },
        { value: 'customers', en: '👥 Customers & Khata', ur: 'کسٹمرز اور کھاتہ' },
        { value: 'bills', en: '🧾 Sales Bills / Invoices', ur: 'سیلز بلز / انوائسز' },
        { value: 'orders', en: '🚚 Booker Orders / KOT', ur: 'بکر آرڈرز / کے او ٹی' },
        { value: 'expenses', en: '💸 Expenses & Vouchers', ur: 'اخراجات اور واؤچرز' },
        { value: 'staff_payroll_profiles', en: '👔 Staff / Payroll Profiles', ur: 'اسٹاف / پے رول پروفائلز' },
        { value: 'stock_returns', en: '↩️ Sales / Delivery Returns', ur: 'سیل / ڈلیوری ریٹرنز' },
        { value: 'damage_claims', en: '⚠️ Damage & Expiry Claims', ur: 'ڈیمیج اور ایکسپائری کلیمز' }
    ]);
    ebBilingualizeSelectOptions(document.getElementById('singleExportFormatSelect'), [
        { value: 'csv', en: '📊 Excel CSV (.csv)', ur: 'ایکسل سی ایس وی' },
        { value: 'sql', en: '🗄️ SQL Table Dump (.sql)', ur: 'ایس کیو ایل ڈمپ' },
        { value: 'json', en: '📦 Module JSON (.json)', ur: 'ماڈیول جے ایس او این' }
    ]);
}

function ebRenderSQLStudioInitialState(cleared) {
    if (typeof document === 'undefined') return;
    const statusBadge = document.getElementById('sqlStudioStatusBadge');
    const summaryBox = document.getElementById('sqlStudioSummaryBox');
    if (statusBadge) {
        statusBadge.style.background = '#e2e8f0';
        statusBadge.style.color = '#475569';
        statusBadge.innerHTML = ebCompact('Waiting for input...', 'ان پٹ کا انتظار...');
    }
    if (summaryBox) {
        const msg = cleared
            ? ebMix('Cleared. Paste SQL or CSV data to convert.', 'صاف ہو گیا۔ کنورٹ کرنے کے لیے SQL یا CSV ڈیٹا پیسٹ کریں۔')
            : ebMix('Paste SQL or CSV data and click Parse &amp; Convert, or select any .sql / .csv file above.', 'SQL یا CSV ڈیٹا پیسٹ کر کے Parse &amp; Convert دبائیں، یا اوپر سے کوئی بھی .sql / .csv فائل سلیکٹ کریں۔');
        summaryBox.innerHTML = `<div style="text-align:center; padding:22px 10px; color:#94a3b8;"><i class="fas fa-database" style="font-size:24px; margin-bottom:6px; display:block;"></i>${msg}</div>`;
    }
}

// ============================================
// 🛡️ AUTH GUARD & STATS LOAD
// ============================================
if (auth) {
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = 'auth.html';
            return;
        }
        myUid = user.uid;

        try {
            const doc = await db.collection('users').doc(user.uid).get();
            if (!doc.exists) {
                window.location.href = 'dashboard.html';
                return;
            }
            myUser = doc.data();

            // Permissions check
            if (myUser.role === 'booker') {
                const p = myUser.permissions || {};
                if (!p.backup) {
                    Swal.fire({
                        icon: 'warning',
                        title: `🔒 ${ebT('Access Denied', 'رسائی ممنوع')}`,
                        text: ebT('You do not have permission to access Backup & Restore.', 'آپ کے پاس بیک اپ اور ریسٹور دیکھنے کی اجازت نہیں ہے۔'),
                        confirmButtonText: ebT('OK', 'ٹھیک ہے'),
                        confirmButtonColor: '#27ae60'
                    }).then(() => window.location.href = 'dashboard.html');
                    return;
                }
            }

            // Support Multi-Agency / Sub-Branch Switcher
            myAgencyId = localStorage.getItem('eb_active_agencyId') || myUser.agencyId;
            if (!myAgencyId) {
                window.location.href = 'profile.html';
                return;
            }

            try {
                const agDoc = await db.collection('agencies').doc(myAgencyId).get();
                myAgency = agDoc.exists ? { id: agDoc.id, ...agDoc.data() } : { id: myAgencyId };
                if (window.BusinessCategories && typeof window.BusinessCategories.applyActiveCategoryProfile === 'function') {
                    myAgency = window.BusinessCategories.applyActiveCategoryProfile(myAgency);
                }
                const h = document.getElementById('agencyNameHeader');
                if (h && myAgency.name) h.innerText = `🏢 ${myAgency.name}`;
            } catch (e) {}

            if (window.SaaSModules && typeof window.SaaSModules.syncPackagesFromCloud === 'function') {
                await window.SaaSModules.syncPackagesFromCloud(db);
            }
            if (window.SaaSModules && typeof window.SaaSModules.enforcePagePaywall === 'function') {
                const isLocked = window.SaaSModules.enforcePagePaywall('backup', '.panel-container', myAgency, myUser.role, myUser);
                if (isLocked) {
                    if (window.hideNHLoader) window.hideNHLoader();
                    return;
                }
            }

            updateBackupStatusUI();
            await loadStatsCounts();

            if (window.hideNHLoader) {
                window.hideNHLoader();
            }

        } catch (e) {
            console.error('Backup init error:', e);
            if (window.hideNHLoader) window.hideNHLoader();
        }
    });
}

// Listen for live Business Category switch from Sidebar
if (typeof window !== 'undefined') {
    window.addEventListener('ebCategoryChanged', async () => {
        if (myAgency && window.BusinessCategories && typeof window.BusinessCategories.applyActiveCategoryProfile === 'function') {
            myAgency = window.BusinessCategories.applyActiveCategoryProfile(myAgency);
        }
        updateBackupStatusUI();
        await loadStatsCounts();
    });
}

// Update last backup date badge & active category badge
function updateBackupStatusUI() {
    if (typeof document === 'undefined') return;
    const badge = document.getElementById('backupStatusBadge');
    const catBadge = document.getElementById('backupActiveCategoryBadge');
    const activeCat = getActiveBackupCategory();

    if (catBadge) {
        catBadge.innerHTML = `<i class="fas fa-layer-group"></i> ${ebGetCategoryLabel(activeCat)}`;
    }

    if (!badge) return;
    const lastDate = localStorage.getItem(`eb_last_backup_date_${myAgencyId}_${activeCat}`) || localStorage.getItem(`eb_last_backup_date_${myAgencyId}`);

    if (lastDate) {
        const d = new Date(lastDate);
        const daysAgo = Math.floor((new Date() - d) / (1000 * 60 * 60 * 24));
        if (daysAgo <= 3) {
            badge.className = 'backup-status-badge status-safe';
            badge.innerHTML = `<i class="fas fa-check-circle"></i> ${ebMix(`Data Safe (${activeCat}): Backed up ${d.toLocaleDateString()}`, `ڈیٹا محفوظ: آخری بیک اپ ${d.toLocaleDateString()}`)}`;
        } else {
            badge.className = 'backup-status-badge status-warn';
            badge.innerHTML = `<i class="fas fa-triangle-exclamation"></i> ${ebMix(`Reminder (${activeCat}): Last backup was ${daysAgo} days ago`, `یاددہانی: آخری بیک اپ ${daysAgo} دن پہلے لیا گیا`)}`;
        }
    } else {
        badge.className = 'backup-status-badge status-warn';
        badge.innerHTML = `<i class="fas fa-triangle-exclamation"></i> ${ebMix(`No Backup Taken Yet (${activeCat})!`, 'ابھی تک کوئی بیک اپ نہیں لیا گیا!')}`;
    }
}

// Load counts across all agency collections isolated strictly to the active business category
async function loadStatsCounts() {
    if (!db || !myAgencyId) return;
    try {
        const activeCat = getActiveBackupCategory();
        const safeGet = (col) => db.collection(col).where('agencyId', '==', myAgencyId).get().catch(() => ({ forEach: () => {} }));
        const [
            stockSnap, custSnap, billsSnap, moveSnap,
            ordersSnap, expSnap, expCatSnap, payrollSnap, returnsSnap, claimsSnap
        ] = await Promise.all([
            safeGet('stock'),
            safeGet('customers'),
            safeGet('bills'),
            safeGet('movements'),
            safeGet('orders'),
            safeGet('expenses'),
            safeGet('expense_categories'),
            safeGet('staff_payroll_profiles'),
            safeGet('stock_returns'),
            safeGet('damage_claims')
        ]);

        const toIsolatedList = (snap) => {
            const arr = [];
            snap.forEach(d => {
                const rec = { id: d.id, ...d.data() };
                if (matchesBackupActiveCategory(rec, activeCat, myAgency)) {
                    arr.push(rec);
                }
            });
            return arr;
        };

        allStock = toIsolatedList(stockSnap);
        allCustomers = toIsolatedList(custSnap);
        allBills = toIsolatedList(billsSnap);
        allMovements = toIsolatedList(moveSnap);
        allOrders = toIsolatedList(ordersSnap);
        allExpenses = toIsolatedList(expSnap);
        allExpenseCategories = toIsolatedList(expCatSnap);
        allPayrollProfiles = toIsolatedList(payrollSnap);
        allStockReturns = toIsolatedList(returnsSnap);
        allDamageClaims = toIsolatedList(claimsSnap);

        const elStock = document.getElementById('cntStock');
        if (elStock) elStock.innerText = allStock.length;
        const elCust = document.getElementById('cntCustomers');
        if (elCust) elCust.innerText = allCustomers.length;
        const elBills = document.getElementById('cntBills');
        if (elBills) elBills.innerText = allBills.length;
        const elMove = document.getElementById('cntMovements');
        if (elMove) elMove.innerText = allMovements.length;

        const cntExpEl = document.getElementById('cntExpenses');
        if (cntExpEl) cntExpEl.innerText = `${allExpenses.length + allPayrollProfiles.length}`;
        const cntOpsEl = document.getElementById('cntClaimsReturns');
        if (cntOpsEl) cntOpsEl.innerText = `${allOrders.length + allStockReturns.length + allDamageClaims.length}`;

    } catch (e) {
        console.error('Stats count error:', e);
    }
}

function getCurrentFullBackupPayload() {
    return buildAgencyBackupPayload(myAgencyId, myAgency, {
        stock: allStock,
        customers: allCustomers,
        bills: allBills,
        movements: allMovements,
        orders: allOrders,
        expenses: allExpenses,
        expense_categories: allExpenseCategories,
        staff_payroll_profiles: allPayrollProfiles,
        stock_returns: allStockReturns,
        damage_claims: allDamageClaims
    });
}

function triggerBlobDownload(content, mimeType, filename) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function recordBackupTimestamp() {
    const activeCat = getActiveBackupCategory();
    localStorage.setItem(`eb_last_backup_date_${myAgencyId}_${activeCat}`, new Date().toISOString());
    updateBackupStatusUI();
}

// ============================================
// 📥 1. MULTI-FORMAT COMPLETE BACKUP DOWNLOADS
// ============================================

// 1A. Download Full .JSON Snapshot
document.getElementById('btnDownloadBackup')?.addEventListener('click', async () => {
    const btn = document.getElementById('btnDownloadBackup');
    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${ebMix('Preparing Backup...', 'بیک اپ تیار ہو رہا ہے...')}`;

    try {
        await loadStatsCounts();
        const backupPayload = getCurrentFullBackupPayload();
        const jsonStr = JSON.stringify(backupPayload, null, 2);

        const activeCat = getActiveBackupCategory();
        const safeName = ((myAgency && myAgency.name) || 'Agency').replace(/[^a-zA-Z0-9]/g, '_');
        const dateStr = new Date().toISOString().slice(0, 10);
        const filename = `NHPOS_Backup_${safeName}_${activeCat}_${dateStr}.json`;

        triggerBlobDownload(jsonStr, 'application/json', filename);
        recordBackupTimestamp();

        btn.disabled = false;
        btn.innerHTML = `<i class="fas fa-download"></i> <span data-eb-en="DOWNLOAD FULL BACKUP (.JSON SNAPSHOT)" data-eb-ur="مکمل بیک اپ ڈاؤن لوڈ کریں (.JSON)">${ebMix('DOWNLOAD FULL BACKUP (.JSON SNAPSHOT)', 'مکمل بیک اپ ڈاؤن لوڈ کریں (.JSON)')}</span>`;

        Swal.fire({
            icon: 'success',
            title: `🎉 ${ebT('Complete JSON Backup Downloaded!', 'مکمل JSON بیک اپ ڈاؤن لوڈ ہو گیا!')}`,
            html: `${ebMix('File', 'فائل')}: <b>${filename}</b><br><br>
                   📦 ${ebMix('Stock', 'اسٹاک')}: <b>${allStock.length}</b> | 👥 ${ebMix('Customers', 'کسٹمرز')}: <b>${allCustomers.length}</b><br>
                   🧾 ${ebMix('Invoices', 'بلز')}: <b>${allBills.length}</b> | 💸 ${ebMix('Expenses &amp; Payroll', 'اخراجات اور تنخواہیں')}: <b>${allExpenses.length + allPayrollProfiles.length}</b><br>
                   🚚 ${ebMix('Orders, Returns &amp; Claims', 'آرڈرز، ریٹرنز اور کلیمز')}: <b>${allOrders.length + allStockReturns.length + allDamageClaims.length}</b><br><br>
                   <small style="color:#059669;">${ebMix('Keep this file safely stored in your Google Drive or USB drive.', 'یہ فائل اپنے گوگل ڈرائیو یا یو ایس بی میں محفوظ کر لیں۔')}</small>`,
            confirmButtonText: ebT('OK', 'ٹھیک ہے')
        });

    } catch (e) {
        btn.disabled = false;
        btn.innerHTML = `<i class="fas fa-download"></i> <span data-eb-en="DOWNLOAD FULL BACKUP (.JSON SNAPSHOT)" data-eb-ur="مکمل بیک اپ ڈاؤن لوڈ کریں (.JSON)">${ebMix('DOWNLOAD FULL BACKUP (.JSON SNAPSHOT)', 'مکمل بیک اپ ڈاؤن لوڈ کریں (.JSON)')}</span>`;
        Swal.fire(ebT('Error', 'خرابی'), `${ebT('Backup failed', 'بیک اپ ناکام')}: ${e.message}`, 'error');
    }
});

// 1B. Download Full .SQL Database Dump
document.getElementById('btnDownloadSQLBackup')?.addEventListener('click', async () => {
    try {
        await loadStatsCounts();
        const backupPayload = getCurrentFullBackupPayload();
        const sqlDump = generateAgencySQLDump(backupPayload);

        const activeCat = getActiveBackupCategory();
        const safeName = ((myAgency && myAgency.name) || 'Agency').replace(/[^a-zA-Z0-9]/g, '_');
        const dateStr = new Date().toISOString().slice(0, 10);
        const filename = `NHPOS_SQL_Database_${safeName}_${activeCat}_${dateStr}.sql`;

        triggerBlobDownload(sqlDump, 'application/sql;charset=utf-8;', filename);
        recordBackupTimestamp();

        Swal.fire({
            icon: 'success',
            title: `🗄️ ${ebT('Full SQL Database Dump Ready!', 'مکمل SQL ڈیٹابیس ڈمپ تیار ہے!')}`,
            html: `${ebMix('File', 'فائل')}: <b>${filename}</b><br><br>
                   ${ebMix('All 10 collections (Stock, Customers, Bills, Orders, Expenses, Payroll, Returns, Claims) have been exported in <b>CREATE TABLE</b> and <b>INSERT INTO</b> SQL format.', 'تمام 10 کلیکشنز (اسٹاک، کسٹمرز، بلز، آرڈرز، اخراجات، پے رول، ریٹرنز، کلیمز) SQL فارمیٹ میں ایکسپورٹ ہو گئی ہیں۔')}<br><br>
                   <small style="color:#1d4ed8;">${ebMix('You can run this .SQL file in MySQL/SQLite or restore it directly back into NH POS!', 'اس .SQL فائل کو MySQL/SQLite میں بھی چلایا جا سکتا ہے اور NH POS میں براہِ راست ریسٹور بھی کیا جا سکتا ہے!')}</small>`,
            confirmButtonText: ebT('OK', 'ٹھیک ہے')
        });
    } catch (e) {
        Swal.fire(ebT('Error', 'خرابی'), `${ebT('SQL export failed', 'SQL ایکسپورٹ ناکام')}: ${e.message}`, 'error');
    }
});

// 1C. Download Multi-Sheet Microsoft Excel Workbook (.XLS XML Spreadsheet)
function generateExcelXMLWorkbook(backupPayload) {
    const escXml = (s) => String(s === undefined || s === null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const d = backupPayload.data || {};
    const sheets = [
        {
            name: 'Stock_Inventory',
            cols: ['id', 'name', 'brandCompany', 'category', 'barcode', 'qty', 'unit', 'purchaseRate', 'tradePriceTP', 'retailRate', 'cartonPacking', 'skuBatchCode', 'expiryDate'],
            rows: (d.stock || []).map(s => {
                const ind = s.industryFields || {};
                return {
                    id: s.id || '',
                    name: s.name || '',
                    brandCompany: s.brandCompany || ind.brandCompany || s.supplierName || '',
                    category: s.category || 'General',
                    barcode: s.barcode || '',
                    qty: s.qty || 0,
                    unit: s.unit || 'Unit',
                    purchaseRate: s.purchaseRate || 0,
                    tradePriceTP: s.tradePriceTP || ind.tradePriceTP || s.wholesaleRate || 0,
                    retailRate: s.retailRate || 0,
                    cartonPacking: s.cartonPacking || ind.cartonPacking || '',
                    skuBatchCode: s.skuBatchCode || ind.skuBatchCode || s.batchNo || '',
                    expiryDate: s.expiryDate || ind.expiryDate || ''
                };
            })
        },
        {
            name: 'Customers_Khata',
            cols: ['id', 'name', 'shopName', 'mobile', 'custSubCategory', 'affiliatedBoard', 'balance', 'creditLimit'],
            rows: (d.customers || []).map(c => ({
                id: c.id || '',
                name: c.name || '',
                shopName: c.shopName || '',
                mobile: c.mobile || '',
                custSubCategory: c.custSubCategory || c.subCategory || '',
                affiliatedBoard: c.affiliatedBoard || c.route || '',
                balance: c.balance || 0,
                creditLimit: c.creditLimit || 0
            }))
        },
        {
            name: 'Sales_Bills',
            cols: ['billNo', 'date', 'customerName', 'grandTotal', 'received', 'balance', 'paymentMode', 'bookerName'],
            rows: (d.bills || []).map(b => ({
                billNo: b.billNo || b.id || '',
                date: b.date || '',
                customerName: b.customerName || 'Walk-in',
                grandTotal: b.grandTotal || b.billAmount || 0,
                received: b.received || b.paidAmount || 0,
                balance: b.balance || 0,
                paymentMode: b.paymentMode || 'cash',
                bookerName: b.bookerName || ''
            }))
        },
        {
            name: 'Orders_Dispatch',
            cols: ['orderNo', 'date', 'customerName', 'grandTotal', 'status', 'bookerName'],
            rows: (d.orders || []).map(o => ({
                orderNo: o.orderNo || o.id || '',
                date: o.date || '',
                customerName: o.customerName || '',
                grandTotal: o.grandTotal || 0,
                status: o.status || '',
                bookerName: o.bookerName || ''
            }))
        },
        {
            name: 'Expenses_Payroll',
            cols: ['date', 'categoryName', 'title', 'staffName', 'amount', 'paymentMode', 'payrollMonth'],
            rows: (d.expenses || []).map(e => ({
                date: e.date || '',
                categoryName: e.categoryName || e.categoryId || '',
                title: e.title || '',
                staffName: e.staffName || '',
                amount: e.amount || 0,
                paymentMode: e.paymentMode || 'cash',
                payrollMonth: e.payrollMonth || ''
            }))
        },
        {
            name: 'Damage_Claims',
            cols: ['voucherNo', 'incidentDate', 'itemName', 'supplierName', 'category', 'qty', 'totalLoss', 'recoveredAmount', 'status'],
            rows: (d.damage_claims || []).map(c => ({
                voucherNo: c.voucherNo || '',
                incidentDate: c.incidentDate || '',
                itemName: c.itemName || '',
                supplierName: c.supplierName || '',
                category: c.category || '',
                qty: c.qty || 0,
                totalLoss: c.totalLoss || c.lossAmount || 0,
                recoveredAmount: c.recoveredAmount || 0,
                status: c.status || 'pending'
            }))
        }
    ];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<?mso-application progid="Excel.Sheet"?>\n`;
    xml += `<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n`;

    sheets.forEach(sh => {
        xml += `  <Worksheet ss:Name="${escXml(sh.name)}">\n    <Table>\n`;
        xml += `      <Row>\n`;
        sh.cols.forEach(c => {
            xml += `        <Cell><Data ss:Type="String">${escXml(c.toUpperCase())}</Data></Cell>\n`;
        });
        xml += `      </Row>\n`;
        sh.rows.forEach(r => {
            xml += `      <Row>\n`;
            sh.cols.forEach(c => {
                const v = r[c];
                const isNum = typeof v === 'number' && Number.isFinite(v);
                xml += `        <Cell><Data ss:Type="${isNum ? 'Number' : 'String'}">${escXml(v)}</Data></Cell>\n`;
            });
            xml += `      </Row>\n`;
        });
        xml += `    </Table>\n  </Worksheet>\n`;
    });

    xml += `</Workbook>`;
    return xml;
}

document.getElementById('btnDownloadExcelWorkbook')?.addEventListener('click', async () => {
    try {
        await loadStatsCounts();
        const payload = getCurrentFullBackupPayload();
        const xml = generateExcelXMLWorkbook(payload);
        const activeCat = getActiveBackupCategory();
        const safeName = ((myAgency && myAgency.name) || 'Agency').replace(/[^a-zA-Z0-9]/g, '_');
        const dateStr = new Date().toISOString().slice(0, 10);
        const filename = `NHPOS_Workbook_${safeName}_${activeCat}_${dateStr}.xls`;

        triggerBlobDownload(xml, 'application/vnd.ms-excel;charset=utf-8;', filename);
        recordBackupTimestamp();

        Swal.fire({
            icon: 'success',
            title: `📊 ${ebT('Multi-Sheet Excel Workbook Downloaded!', 'ملٹی شیٹ ایکسل ورک بک ڈاؤن لوڈ ہو گئی!')}`,
            html: `${ebMix('File', 'فائل')}: <b>${filename}</b><br><br>${ebMix('This Excel workbook includes 6 separate sheets (Stock, Customers, Bills, Orders, Expenses, Claims).', 'اس ایکسل ورک بک میں 6 الگ شیٹس (اسٹاک، کسٹمرز، بلز، آرڈرز، اخراجات، کلیمز) شامل ہیں۔')}`,
            confirmButtonText: ebT('OK', 'ٹھیک ہے')
        });
    } catch (e) {
        Swal.fire(ebT('Error', 'خرابی'), `${ebT('Excel Workbook export failed', 'ایکسل ورک بک ایکسپورٹ ناکام')}: ${e.message}`, 'error');
    }
});

// 1D. Download Combined Master CSV Archive (.CSV)
document.getElementById('btnDownloadMasterCSV')?.addEventListener('click', async () => {
    try {
        await loadStatsCounts();
        const payload = getCurrentFullBackupPayload();
        const d = payload.data || {};
        const headers = ['NHPOS_COLLECTION', 'ID', 'NAME_OR_TITLE', 'PARTY_OR_BRAND', 'DATE', 'QTY', 'RATE_OR_COST', 'TOTAL_OR_BALANCE', 'STATUS_OR_MODE', 'RAW_JSON'];
        const csvLines = [headers.map(h => `"${h}"`).join(',')];

        const pushRow = (col, id, name, party, date, qty, rate, total, status, raw) => {
            const vals = [col, id, name, party, date, qty, rate, total, status, JSON.stringify(raw || {})];
            csvLines.push(vals.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','));
        };

        (d.stock || []).forEach(s => pushRow('stock', s.id, s.name, s.brandCompany || s.supplierName || '', s.expiryDate || '', s.qty || 0, s.purchaseRate || 0, s.retailRate || 0, s.unit || 'Pcs', s));
        (d.customers || []).forEach(c => pushRow('customers', c.id, c.name, c.shopName || '', '', 0, 0, c.balance || 0, c.mobile || '', c));
        (d.bills || []).forEach(b => pushRow('bills', b.billNo || b.id, b.customerName || 'Walk-in', b.bookerName || '', b.date || '', (b.items || []).length, b.received || b.paidAmount || 0, b.grandTotal || b.billAmount || 0, b.paymentMode || 'cash', b));
        (d.orders || []).forEach(o => pushRow('orders', o.orderNo || o.id, o.customerName || '', o.bookerName || '', o.date || '', (o.items || []).length, 0, o.grandTotal || 0, o.status || '', o));
        (d.expenses || []).forEach(e => pushRow('expenses', e.id, e.title || e.categoryName || '', e.staffName || '', e.date || '', 1, e.amount || 0, e.amount || 0, e.paymentMode || 'cash', e));
        (d.damage_claims || []).forEach(c => pushRow('damage_claims', c.voucherNo || c.id, c.itemName || '', c.supplierName || '', c.incidentDate || '', c.qty || 0, c.recoveredAmount || 0, c.totalLoss || c.lossAmount || 0, c.status || 'pending', c));

        const activeCat = getActiveBackupCategory();
        const safeName = ((myAgency && myAgency.name) || 'Agency').replace(/[^a-zA-Z0-9]/g, '_');
        const dateStr = new Date().toISOString().slice(0, 10);
        const filename = `NHPOS_Master_Archive_${safeName}_${activeCat}_${dateStr}.csv`;

        triggerBlobDownload(csvLines.join('\n'), 'text/csv;charset=utf-8;', filename);
        recordBackupTimestamp();

        Swal.fire({
            icon: 'success',
            title: `📑 ${ebT('Master CSV Archive Downloaded!', 'ماسٹر CSV آرکائیو ڈاؤن لوڈ ہو گیا!')}`,
            html: `${ebMix('File', 'فائل')}: <b>${filename}</b><br><br>${ebMix('This Master CSV file can be opened in Excel and can also be restored directly back into NH POS!', 'یہ ماسٹر CSV فائل ایکسل میں بھی کھل سکتی ہے اور واپس NH POS میں براہِ راست ریسٹور بھی ہو سکتی ہے!')}`,
            confirmButtonText: ebT('OK', 'ٹھیک ہے')
        });
    } catch (e) {
        Swal.fire(ebT('Error', 'خرابی'), `${ebT('Master CSV export failed', 'ماسٹر CSV ایکسپورٹ ناکام')}: ${e.message}`, 'error');
    }
});

// 1E. Download Printable HTML / PDF Audit Book
document.getElementById('btnDownloadAuditHTML')?.addEventListener('click', async () => {
    try {
        await loadStatsCounts();
        const payload = getCurrentFullBackupPayload();
        const d = payload.data || {};
        const totalStockVal = (d.stock || []).reduce((acc, s) => acc + ((Number(s.qty) || 0) * (Number(s.purchaseRate) || 0)), 0);
        const totalKhataVal = (d.customers || []).reduce((acc, c) => acc + (Number(c.balance) || 0), 0);
        const totalSalesVal = (d.bills || []).reduce((acc, b) => acc + (Number(b.grandTotal || b.billAmount) || 0), 0);

        const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>NH POS Audit Book — ${payload.agencyName}</title>
<style>
  body { font-family: Arial, sans-serif; color: #0f172a; margin: 24px; }
  h1 { margin: 0 0 4px 0; font-size: 22px; }
  .meta { color: #475569; font-size: 13px; margin-bottom: 18px; }
  .kpi-row { display: flex; gap: 14px; margin-bottom: 20px; flex-wrap: wrap; }
  .kpi { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 14px; min-width: 160px; background: #f8fafc; }
  .kpi b { font-size: 16px; display: block; margin-top: 4px; color: #0284c7; }
  h2 { font-size: 16px; border-bottom: 2px solid #0f172a; padding-bottom: 4px; margin-top: 24px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
  th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
  th { background: #e2e8f0; }
  @media print { .no-print { display: none; } }
</style>
</head>
<body>
  <div class="no-print" style="margin-bottom:16px;">
    <button onclick="window.print()" style="padding:8px 16px; background:#0284c7; color:#fff; border:none; border-radius:6px; font-weight:bold; cursor:pointer;">🖨️ Print / Save as PDF</button>
  </div>
  <h1>🏢 ${payload.agencyName} — Complete Offline Audit Book</h1>
  <div class="meta">Category: <b>${ebGetCategoryLabelPlain(payload.businessCategory)} (${payload.businessCategory})</b> | Exported: <b>${new Date(payload.exportDate).toLocaleString()}</b></div>
  <div class="kpi-row">
    <div class="kpi">📦 Stock Items (${(d.stock || []).length})<b>Rs ${totalStockVal.toLocaleString()}</b></div>
    <div class="kpi">👥 Market Khata (${(d.customers || []).length})<b>Rs ${totalKhataVal.toLocaleString()}</b></div>
    <div class="kpi">🧾 Total Sales (${(d.bills || []).length} Bills)<b>Rs ${totalSalesVal.toLocaleString()}</b></div>
  </div>
  <h2>1. Stock & Inventory (${(d.stock || []).length})</h2>
  <table>
    <thead><tr><th>#</th><th>Item Name</th><th>Brand/Supplier</th><th>Qty</th><th>Unit</th><th>Cost Rate</th><th>Retail Rate</th><th>Expiry/Batch</th></tr></thead>
    <tbody>
      ${(d.stock || []).map((s, i) => `<tr><td>${i + 1}</td><td>${s.name || ''}</td><td>${s.brandCompany || s.supplierName || '-'}</td><td>${s.qty || 0}</td><td>${s.unit || ''}</td><td>${s.purchaseRate || 0}</td><td>${s.retailRate || 0}</td><td>${s.expiryDate || s.skuBatchCode || '-'}</td></tr>`).join('')}
    </tbody>
  </table>
  <h2>2. Customer Khata Balances (${(d.customers || []).length})</h2>
  <table>
    <thead><tr><th>#</th><th>Customer Name</th><th>Shop Name</th><th>Mobile</th><th>Route / Segment</th><th>Balance (Rs)</th></tr></thead>
    <tbody>
      ${(d.customers || []).map((c, i) => `<tr><td>${i + 1}</td><td>${c.name || ''}</td><td>${c.shopName || '-'}</td><td>${c.mobile || '-'}</td><td>${c.affiliatedBoard || c.custSubCategory || '-'}</td><td><b>${Number(c.balance || 0).toLocaleString()}</b></td></tr>`).join('')}
    </tbody>
  </table>
</body>
</html>`;

        const activeCat = getActiveBackupCategory();
        const safeName = ((myAgency && myAgency.name) || 'Agency').replace(/[^a-zA-Z0-9]/g, '_');
        const dateStr = new Date().toISOString().slice(0, 10);
        const filename = `NHPOS_Audit_Book_${safeName}_${activeCat}_${dateStr}.html`;

        triggerBlobDownload(html, 'text/html;charset=utf-8;', filename);
        recordBackupTimestamp();
    } catch (e) {
        Swal.fire(ebT('Error', 'خرابی'), `${ebT('Audit HTML export failed', 'آڈٹ HTML ایکسپورٹ ناکام')}: ${e.message}`, 'error');
    }
});

// ============================================
// 📤 2. UNIVERSAL RESTORE & DIRECT SQL / CSV / JSON UPLOAD
// ============================================
const fileInput = document.getElementById('restoreFileInput');
const dropZone = document.getElementById('dropZone');

if (dropZone) {
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processRestoreFile(e.dataTransfer.files[0]);
        }
    });
}
if (fileInput) {
    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            processRestoreFile(e.target.files[0]);
            e.target.value = '';
        }
    });
}

function processRestoreFile(file) {
    const lowerName = (file.name || '').toLowerCase();
    const isJson = lowerName.endsWith('.json');
    const isSql = lowerName.endsWith('.sql');
    const isCsv = lowerName.endsWith('.csv') || lowerName.endsWith('.txt');

    if (!isJson && !isSql && !isCsv) {
        Swal.fire(`⚠️ ${ebT('Unsupported File', 'غیر معاونت یافتہ فائل')}`, ebT('Please upload only a .JSON, .SQL, or .CSV file!', 'براہِ کرم صرف .JSON، .SQL یا .CSV فائل اپلوڈ کریں!'), 'warning');
        return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const rawText = String(event.target.result || '');
            const activeCat = getActiveBackupCategory();
            const defaultHintEl = document.getElementById('importDefaultCollection');
            const defaultHint = defaultHintEl ? defaultHintEl.value : 'auto';

            let parsed = null;
            if (isJson || rawText.trim().startsWith('{')) {
                parsed = JSON.parse(rawText);
                // Also support raw JSON array of objects
                if (Array.isArray(parsed)) {
                    const col = resolveTargetCollectionFromTableName(file.name, Object.keys(parsed[0] || {}), defaultHint);
                    const normalizedList = parsed.map((r, i) => normalizeImportedRecord(r, col, activeCat, i)).filter(Boolean);
                    parsed = buildAgencyBackupPayload(myAgencyId, myAgency, { [col]: normalizedList }, activeCat);
                }
            } else if (isSql || /INSERT\s+INTO|CREATE\s+TABLE/i.test(rawText)) {
                parsed = parseSQLDumpToNHPOS(rawText, defaultHint, activeCat, myAgencyId, myAgency);
                // Also populate the SQL Studio box so the user can inspect it
                const studioInput = document.getElementById('sqlStudioInput');
                if (studioInput) {
                    studioInput.value = rawText.slice(0, 50000);
                    renderSQLStudioPreview(parsed);
                }
            } else {
                parsed = parseCSVToNHPOS(rawText, defaultHint, activeCat, myAgencyId, myAgency);
                const studioInput = document.getElementById('sqlStudioInput');
                if (studioInput) {
                    studioInput.value = rawText.slice(0, 50000);
                    renderSQLStudioPreview(parsed);
                }
            }

            await openRestoreConfirmationModal(parsed, file.name);

        } catch (e) {
            Swal.fire(`❌ ${ebT('Error', 'خرابی')}`, `${ebT('Failed to parse file', 'فائل پارس کرنے میں مسئلہ')}: ${e.message}`, 'error');
        }
    };
    reader.readAsText(file);
}

async function openRestoreConfirmationModal(parsed, sourceLabel = 'Backup File') {
    const validation = validateBackupPayload(parsed);
    if (!validation.valid) {
        Swal.fire(`❌ ${ebT('Invalid Format', 'غلط فارمیٹ')}`, ebT('This file is not in a valid NH POS JSON, SQL, or CSV format!', 'یہ فائل درست NH POS JSON، SQL یا CSV فارمیٹ میں نہیں ہے!'), 'error');
        return;
    }

    const d = parsed.data;
    const c = validation.counts;
    const srcBadge = parsed.sourceFormat ? `<span style="background:#dbeafe; color:#1d4ed8; padding:2px 8px; border-radius:6px; font-size:11px; font-weight:800;">${ebMix(`Converted from ${parsed.sourceFormat}`, `${parsed.sourceFormat} سے کنورٹ شدہ`)}</span>` : '';

    const { value: confirmChoice } = await Swal.fire({
        title: `🔄 ${ebT('Restore / Import Preview', 'ریسٹور / امپورٹ پریویو')}`,
        html: `
            <div style="text-align:left; font-size:13px;">
                <p><b>${ebMix('Source', 'ذریعہ')}:</b> <span style="color:#0284c7;">${sourceLabel}</span> ${srcBadge}</p>
                <p><b>${ebMix('Target Category Workspace', 'ٹارگٹ کیٹیگری ورک اسپیس')}:</b> <span style="font-weight:800; color:#10b981;">${ebGetCategoryLabel(getActiveBackupCategory())}</span></p>
                <hr style="margin:10px 0; border:none; border-top:1px solid #e2e8f0;">
                <p>📦 <b>${ebMix('Stock Items', 'اسٹاک آئٹمز')}:</b> ${c.stock} | 👥 <b>${ebMix('Customers', 'کسٹمرز')}:</b> ${c.customers} | 🧾 <b>${ebMix('Sales Bills', 'سیلز بلز')}:</b> ${c.bills}</p>
                <p>💸 <b>${ebMix('Expenses &amp; Payroll', 'اخراجات اور تنخواہیں')}:</b> ${c.expenses + c.staff_payroll_profiles} | 🚚 <b>${ebMix('Orders/Returns/Claims', 'آرڈرز/ریٹرنز/کلیمز')}:</b> ${c.orders + c.stock_returns + c.damage_claims}</p>
                <p>🔄 <b>${ebMix('Stock Movements', 'اسٹاک موومنٹس')}:</b> ${c.movements} | <b>${ebMix('Total Records', 'کل ریکارڈز')}:</b> <b style="color:#2563eb;">${validation.totalDocs}</b></p>
                <hr style="margin:10px 0; border:none; border-top:1px solid #e2e8f0;">
                <label style="font-weight:bold; display:block; margin-bottom:6px;">${ebMix('Select Restore / Import Mode:', 'ریسٹور / امپورٹ موڈ منتخب کریں:')}</label>
                <select id="swalRestoreMode" class="swal2-input" style="margin:0 0 10px 0; width:100%; font-size:13px;">
                    <option value="merge" selected>🔄 ${ebT('Merge & Update (Safe: Adds/updates records without deleting existing data)', 'مرج اور اپڈیٹ (محفوظ: پرانا ڈیٹا حذف کیے بغیر ریکارڈز شامل/اپڈیٹ ہوں گے)')}</option>
                    <option value="clean">🧹 ${ebT('Clean Overwrite (Replaces only current category data with this file)', 'کلین اوور رائٹ (صرف موجودہ کیٹیگری کا ڈیٹا اس فائل سے تبدیل ہو گا)')}</option>
                </select>
                <small style="color:#b91c1c;">${ebMix('Type <b>RESTORE</b> to confirm cloud import:', 'کلاؤڈ امپورٹ کی تصدیق کے لیے <b>RESTORE</b> لکھیں:')}</small>
                <input id="swalConfirmText" class="swal2-input" placeholder="${ebT('Type RESTORE', 'RESTORE لکھیں')}" style="margin-top:4px; width:100%;">
            </div>
        `,
        showCancelButton: true,
        confirmButtonColor: '#3b82f6',
        confirmButtonText: `🚀 ${ebT('Start Cloud Import', 'کلاؤڈ امپورٹ شروع کریں')}`,
        cancelButtonText: ebT('Cancel', 'منسوخ'),
        preConfirm: () => {
            const text = document.getElementById('swalConfirmText').value.trim().toUpperCase();
            if (text !== 'RESTORE') {
                Swal.showValidationMessage(ebT('Please type RESTORE to confirm!', 'تصدیق کے لیے RESTORE لکھیں!'));
                return false;
            }
            return document.getElementById('swalRestoreMode').value;
        }
    });

    if (confirmChoice) {
        await executeRestore(d, confirmChoice);
    }
}

async function executeRestore(data, mode) {
    Swal.fire({
        title: ebT('Restoring Data...', 'ڈیٹا ریسٹور ہو رہا ہے...'),
        html: ebMix('Writing records to cloud database in safe batches...', 'محفوظ بیچز میں ریکارڈز کلاؤڈ ڈیٹابیس میں محفوظ کیے جا رہے ہیں...'),
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        const activeCat = getActiveBackupCategory();
        async function clearCollection(collectionName) {
            const snap = await db.collection(collectionName).where('agencyId', '==', myAgencyId).get();
            if (snap.empty) return;
            const docsToDelete = [];
            snap.docs.forEach(docSnap => {
                const rec = docSnap.data() || {};
                if (matchesBackupActiveCategory(rec, activeCat, myAgency)) {
                    docsToDelete.push(docSnap.ref);
                }
            });
            if (docsToDelete.length === 0) return;
            const chunkSize = 400;
            for (let i = 0; i < docsToDelete.length; i += chunkSize) {
                const batch = db.batch();
                docsToDelete.slice(i, i + chunkSize).forEach(ref => batch.delete(ref));
                await batch.commit();
            }
        }

        // Safe batch writer (max 400 docs per batch, locked to active businessCategory)
        async function commitList(collectionName, items) {
            if (mode === 'clean') {
                await clearCollection(collectionName);
            }
            if (!Array.isArray(items) || items.length === 0) return;
            const chunkSize = 400;
            for (let i = 0; i < items.length; i += chunkSize) {
                const chunk = items.slice(i, i + chunkSize);
                const batch = db.batch();
                chunk.forEach(item => {
                    const rawId = item.id ? String(item.id).replace(/[\/\\]/g, '_') : '';
                    const docId = rawId || db.collection(collectionName).doc().id;
                    const docRef = db.collection(collectionName).doc(docId);
                    const cleanItem = { ...item };
                    delete cleanItem.id;
                    cleanItem.agencyId = myAgencyId; // force match current agency
                    cleanItem.businessCategory = cleanItem.businessCategory || activeCat;
                    cleanItem.categoryConfirmedByCreate = true;
                    batch.set(docRef, cleanItem, { merge: mode !== 'clean' });
                });
                await batch.commit();
            }
        }

        for (const col of BACKUP_COLLECTIONS) {
            if (mode === 'clean' || (Array.isArray(data[col]) && data[col].length > 0)) {
                await commitList(col, data[col] || []);
            }
        }

        // Reload fresh counts
        await loadStatsCounts();

        Swal.fire({
            icon: 'success',
            title: `🎉 ${ebT('Restore / Import Completed!', 'ریسٹور / امپورٹ مکمل ہو گیا!')}`,
            text: ebT('All records have been successfully imported into the active category.', 'تمام ریکارڈز کامیابی سے ایکٹیو کیٹیگری میں امپورٹ ہو گئے ہیں۔'),
            confirmButtonText: ebT('OK', 'ٹھیک ہے')
        });

    } catch (e) {
        console.error('Restore error:', e);
        Swal.fire(`❌ ${ebT('Restore Failed', 'ریسٹور ناکام')}`, e.message, 'error');
    }
}

// ============================================
// 🛠️ 3. INTERACTIVE SQL & CSV CONVERTER STUDIO
// ============================================
function buildSampleSQLDumpForActiveCategory() {
    const activeCat = getActiveBackupCategory();
    if (activeCat === 'restaurant') {
        return `-- 🍔 Sample Restaurant & Fast Food SQL Dump (MySQL / SQLite Compatible)
CREATE TABLE products (id VARCHAR(50), name VARCHAR(120), brandCompany VARCHAR(80), category VARCHAR(80), qty INT, unit VARCHAR(30), purchaseRate DECIMAL(10,2), retailRate DECIMAL(10,2));
INSERT INTO products (id, name, brandCompany, category, qty, unit, purchaseRate, retailRate) VALUES
('rest_sku_1', 'Zinger Burger Jumbo Deal', 'Main Grill Station', 'Burgers & Sandwiches', 120, 'Portion', 260, 480),
('rest_sku_2', 'Chicken Tikka Pizza Large', 'Oven & Pizza Station', 'Artisan Pizzas', 85, 'Platter', 620, 1250),
('rest_sku_3', 'Loaded Cheese Fries', 'Fryer Station', 'Starters & Fries', 150, 'Portion', 140, 320);

CREATE TABLE customers (id VARCHAR(50), name VARCHAR(120), shopName VARCHAR(120), mobile VARCHAR(30), custSubCategory VARCHAR(60), balance DECIMAL(10,2));
INSERT INTO customers (id, name, shopName, mobile, custSubCategory, balance) VALUES
('rest_cust_1', 'Corporate Account - TechPark', 'TechPark Offices', '03001112233', 'Corporate VIP', 14500),
('rest_cust_2', 'Hammad Ali (Regular)', 'Walk-in / Home Delivery', '03219998877', 'Home Delivery', 2400);`;
    }
    if (activeCat === 'medical') {
        return `-- 💊 Sample Medical & Pharmacy SQL Dump (MySQL / SQLite Compatible)
CREATE TABLE medicines (id VARCHAR(50), name VARCHAR(120), brandCompany VARCHAR(80), category VARCHAR(80), qty INT, unit VARCHAR(30), purchaseRate DECIMAL(10,2), retailRate DECIMAL(10,2), skuBatchCode VARCHAR(40), expiryDate VARCHAR(20));
INSERT INTO medicines (id, name, brandCompany, category, qty, unit, purchaseRate, retailRate, skuBatchCode, expiryDate) VALUES
('med_sku_1', 'Augmentin 625mg Tablets (Box)', 'GSK Pharma', 'Antibiotics', 60, 'Box', 410, 480, 'B-9021', '2027-08-30'),
('med_sku_2', 'Panadol Extra 100s Pack', 'Haleon / GSK', 'Analgesics', 140, 'Box', 245, 290, 'PN-441', '2027-11-15');

CREATE TABLE customers (id VARCHAR(50), name VARCHAR(120), shopName VARCHAR(120), mobile VARCHAR(30), balance DECIMAL(10,2));
INSERT INTO customers (id, name, shopName, mobile, balance) VALUES
('med_cust_1', 'Dr. Kamran Clinic Ward', 'City Care Clinic', '03335556677', 19200);`;
    }
    return `-- 🚚 Sample Distributor / Agency SQL Dump (MySQL / PostgreSQL / SQLite Compatible)
CREATE TABLE products (id VARCHAR(50), name VARCHAR(120), brandCompany VARCHAR(80), category VARCHAR(80), qty INT, unit VARCHAR(30), cartonPacking VARCHAR(60), purchaseRate DECIMAL(10,2), tradePriceTP DECIMAL(10,2), retailRate DECIMAL(10,2), bonusSchemeRule VARCHAR(40), skuBatchCode VARCHAR(40), expiryDate VARCHAR(20));
INSERT INTO products (id, name, brandCompany, category, qty, unit, cartonPacking, purchaseRate, tradePriceTP, retailRate, bonusSchemeRule, skuBatchCode, expiryDate) VALUES
('sql_sku_101', 'Super Biscuit Half-Roll Master Carton', 'Principal Agency Alpha', 'Biscuits & Bakery', 55, 'master_ctn', '24 Boxes x 12 Pcs', 1750, 1880, 2040, '12+1', 'LOT-26A', '2027-06-30'),
('sql_sku_102', 'Mango Nectar 250ml Carton', 'Beverage Principal Co', 'Juices & Drinks', 80, 'master_ctn', '24 Tetra Packs', 920, 1020, 1200, '20+2', 'LOT-88B', '2027-04-15');

CREATE TABLE customers (id VARCHAR(50), name VARCHAR(120), shopName VARCHAR(120), mobile VARCHAR(30), custSubCategory VARCHAR(60), affiliatedBoard VARCHAR(80), balance DECIMAL(10,2));
INSERT INTO customers (id, name, shopName, mobile, custSubCategory, affiliatedBoard, balance) VALUES
('sql_cust_201', 'Haji Tariq Kiryana', 'Tariq Mega Mart', '03004455667', 'Wholesale Dealer', '${ebIsMix() ? 'پیر Monday Route' : 'Monday Route'}', 34500),
('sql_cust_202', 'Madina Super Store', 'Madina Cash & Carry', '03217788990', 'Super Mart', '${ebIsMix() ? 'منگل Tuesday Route' : 'Tuesday Route'}', 18200);

CREATE TABLE bills (id VARCHAR(50), billNo VARCHAR(50), date VARCHAR(20), customerName VARCHAR(120), grandTotal DECIMAL(10,2), received DECIMAL(10,2), balance DECIMAL(10,2), bookerName VARCHAR(80));
INSERT INTO bills (id, billNo, date, customerName, grandTotal, received, balance, bookerName) VALUES
('sql_bill_301', 'INV-SQL-901', '2026-05-01', 'Haji Tariq Kiryana', 45000, 30000, 15000, 'Booker Bilal');`;
}

function renderSQLStudioPreview(parsedPayload) {
    lastStudioParsedPayload = parsedPayload;
    studioWasCleared = false;
    const statusBadge = document.getElementById('sqlStudioStatusBadge');
    const summaryBox = document.getElementById('sqlStudioSummaryBox');
    const btnDlJson = document.getElementById('btnStudioDownloadJSON');
    const btnImpCloud = document.getElementById('btnStudioImportCloud');

    if (!summaryBox) return;
    const validation = validateBackupPayload(parsedPayload);

    if (!validation.valid || validation.totalDocs === 0) {
        if (statusBadge) {
            statusBadge.style.background = '#fee2e2';
            statusBadge.style.color = '#b91c1c';
            statusBadge.innerHTML = ebCompact('0 Records Found', 'کوئی ریکارڈ نہیں ملا');
        }
        summaryBox.innerHTML = `<div style="color:#b91c1c; font-weight:700; padding:12px;">⚠️ ${ebMix('No valid SQL INSERT INTO or CSV rows were detected. Please check your SQL syntax or click Load Sample SQL Dump.', 'کوئی درست SQL INSERT INTO یا CSV قطاریں نہیں ملیں۔ براہِ کرم SQL سنٹیکس چیک کریں یا سیمپل SQL ڈمپ لوڈ کریں۔')}</div>`;
        if (btnDlJson) { btnDlJson.disabled = true; btnDlJson.style.opacity = '0.6'; btnDlJson.style.cursor = 'not-allowed'; }
        if (btnImpCloud) { btnImpCloud.disabled = true; btnImpCloud.style.opacity = '0.6'; btnImpCloud.style.cursor = 'not-allowed'; }
        return;
    }

    if (statusBadge) {
        statusBadge.style.background = '#dcfce7';
        statusBadge.style.color = '#15803d';
        statusBadge.innerHTML = `✅ ${ebCompact(`${validation.totalDocs} Records Ready (${parsedPayload.sourceFormat || 'SQL'})`, `${validation.totalDocs} ریکارڈز تیار`)}`;
    }

    const c = validation.counts;
    const tablesHtml = (parsedPayload.detectedTables || []).map(t =>
        `<span style="display:inline-block; background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; padding:2px 8px; border-radius:6px; font-size:11px; font-weight:700; margin:2px;">
            <code>${t.sqlTable}</code> &rarr; <b>${t.targetCollection}</b> (${t.rows})
        </span>`
    ).join(' ');

    // Find first non-empty collection to show a 3-row mini preview table
    const firstNonEmptyCol = BACKUP_COLLECTIONS.find(col => Array.isArray(parsedPayload.data[col]) && parsedPayload.data[col].length > 0);
    let sampleTableHtml = '';
    if (firstNonEmptyCol) {
        const sampleRows = parsedPayload.data[firstNonEmptyCol].slice(0, 3);
        const sampleKeys = Object.keys(sampleRows[0] || {}).filter(k => typeof sampleRows[0][k] !== 'object' && k !== 'categoryConfirmedByCreate').slice(0, 5);
        sampleTableHtml = `
            <div style="margin-top:8px; font-size:11px; font-weight:800; color:#334155;">${ebMix(`Sample Preview (${firstNonEmptyCol.toUpperCase()}):`, 'نمونہ پریویو:')}</div>
            <div style="overflow-x:auto;">
                <table class="preview-mini-table">
                    <thead><tr>${sampleKeys.map(k => `<th>${k}</th>`).join('')}</tr></thead>
                    <tbody>
                        ${sampleRows.map(r => `<tr>${sampleKeys.map(k => `<td>${String(r[k] ?? '')}</td>`).join('')}</tr>`).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    summaryBox.innerHTML = `
        <div style="margin-bottom:6px;"><b>${ebMix('Detected Tables &amp; Auto-Mapping:', 'شناخت شدہ ٹیبلز اور خودکار میپنگ:')}</b><br>${tablesHtml || ebMix('Direct Schema Mapped', 'براہِ راست اسکیما میپ ہو گیا')}</div>
        <div style="display:flex; gap:10px; flex-wrap:wrap; font-size:11.5px; background:#f8fafc; padding:6px 8px; border-radius:6px; border:1px solid #e2e8f0;">
            <span>📦 ${ebMix('Stock', 'اسٹاک')}: <b>${c.stock}</b></span>
            <span>👥 ${ebMix('Customers', 'کسٹمرز')}: <b>${c.customers}</b></span>
            <span>🧾 ${ebMix('Bills', 'بلز')}: <b>${c.bills}</b></span>
            <span>🚚 ${ebMix('Orders', 'آرڈرز')}: <b>${c.orders}</b></span>
            <span>💸 ${ebMix('Expenses/Staff', 'اخراجات/اسٹاف')}: <b>${c.expenses + c.staff_payroll_profiles}</b></span>
            <span>⚠️ ${ebMix('Claims/Returns', 'کلیمز/ریٹرنز')}: <b>${c.damage_claims + c.stock_returns}</b></span>
        </div>
        ${sampleTableHtml}
    `;

    if (btnDlJson) { btnDlJson.disabled = false; btnDlJson.style.opacity = '1'; btnDlJson.style.cursor = 'pointer'; }
    if (btnImpCloud) { btnImpCloud.disabled = false; btnImpCloud.style.opacity = '1'; btnImpCloud.style.cursor = 'pointer'; }
}

document.getElementById('sqlStudioInput')?.addEventListener('input', (e) => {
    const cnt = document.getElementById('sqlStudioCharCount');
    if (cnt) cnt.innerText = `${(e.target.value || '').length.toLocaleString()} chars`;
});

document.getElementById('btnLoadSampleSQLStudio')?.addEventListener('click', () => {
    const input = document.getElementById('sqlStudioInput');
    if (!input) return;
    input.value = buildSampleSQLDumpForActiveCategory();
    const cnt = document.getElementById('sqlStudioCharCount');
    if (cnt) cnt.innerText = `${input.value.length.toLocaleString()} chars`;
    document.getElementById('btnParseSQLStudio')?.click();
});

document.getElementById('btnDownloadSampleSQL')?.addEventListener('click', () => {
    const activeCat = getActiveBackupCategory();
    const sample = buildSampleSQLDumpForActiveCategory();
    triggerBlobDownload(sample, 'application/sql;charset=utf-8;', `Sample_Template_${activeCat}.sql`);
});

document.getElementById('btnClearSQLStudio')?.addEventListener('click', () => {
    const input = document.getElementById('sqlStudioInput');
    if (input) input.value = '';
    const cnt = document.getElementById('sqlStudioCharCount');
    if (cnt) cnt.innerText = '0 chars';
    lastStudioParsedPayload = null;
    studioWasCleared = true;
    const btnDlJson = document.getElementById('btnStudioDownloadJSON');
    const btnImpCloud = document.getElementById('btnStudioImportCloud');
    if (btnDlJson) { btnDlJson.disabled = true; btnDlJson.style.opacity = '0.6'; btnDlJson.style.cursor = 'not-allowed'; }
    if (btnImpCloud) { btnImpCloud.disabled = true; btnImpCloud.style.opacity = '0.6'; btnImpCloud.style.cursor = 'not-allowed'; }
    ebRenderSQLStudioInitialState(true);
});

document.getElementById('btnParseSQLStudio')?.addEventListener('click', () => {
    const input = document.getElementById('sqlStudioInput');
    const raw = (input && input.value ? input.value : '').trim();
    if (!raw) {
        Swal.fire(`ℹ️ ${ebT('Empty Input', 'خالی ان پٹ')}`, ebT('Please paste SQL queries (INSERT INTO ...) or CSV data first, or click "Load Sample SQL Dump".', 'پہلے SQL کوئریز (INSERT INTO ...) یا CSV ڈیٹا پیسٹ کریں، یا "Load Sample SQL Dump" پر کلک کریں۔'), 'info');
        return;
    }
    const activeCat = getActiveBackupCategory();
    const defaultHint = document.getElementById('importDefaultCollection')?.value || 'auto';

    let parsed = null;
    if (/INSERT\s+INTO|CREATE\s+TABLE/i.test(raw)) {
        parsed = parseSQLDumpToNHPOS(raw, defaultHint, activeCat, myAgencyId, myAgency);
    } else if (raw.startsWith('{') || raw.startsWith('[')) {
        try {
            const obj = JSON.parse(raw);
            parsed = Array.isArray(obj)
                ? buildAgencyBackupPayload(myAgencyId, myAgency, { [defaultHint === 'auto' ? 'stock' : defaultHint]: obj.map((r, i) => normalizeImportedRecord(r, defaultHint === 'auto' ? 'stock' : defaultHint, activeCat, i)) }, activeCat)
                : obj;
        } catch (err) {
            Swal.fire(`❌ ${ebT('JSON Error', 'JSON خرابی')}`, err.message, 'error');
            return;
        }
    } else {
        parsed = parseCSVToNHPOS(raw, defaultHint, activeCat, myAgencyId, myAgency);
    }

    renderSQLStudioPreview(parsed);
});

document.getElementById('btnStudioDownloadJSON')?.addEventListener('click', () => {
    if (!lastStudioParsedPayload) return;
    const activeCat = getActiveBackupCategory();
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `Converted_${lastStudioParsedPayload.sourceFormat || 'SQL'}_to_NHPOS_${activeCat}_${dateStr}.json`;
    triggerBlobDownload(JSON.stringify(lastStudioParsedPayload, null, 2), 'application/json', filename);
});

document.getElementById('btnStudioImportCloud')?.addEventListener('click', async () => {
    if (!lastStudioParsedPayload) return;
    await openRestoreConfirmationModal(lastStudioParsedPayload, `Live ${lastStudioParsedPayload.sourceFormat || 'SQL'} Studio Conversion`);
});

// ============================================
// 📑 4. INDIVIDUAL MODULE EXPORTS (CSV / SQL / JSON)
// ============================================
function downloadCSV(filename, keys, rows) {
    if (!rows || rows.length === 0) {
        Swal.fire(`ℹ️ ${ebT('No Data', 'کوئی ڈیٹا نہیں')}`, ebT('There is no data in this module to export!', 'اس ماڈیول میں ایکسپورٹ کرنے کے لیے کوئی ڈیٹا موجود نہیں ہے!'), 'info');
        return;
    }

    const fmt = document.getElementById('singleExportFormatSelect')?.value || 'csv';
    const baseName = filename.replace(/\.csv$/i, '');

    if (fmt === 'json') {
        triggerBlobDownload(JSON.stringify(rows, null, 2), 'application/json', `${baseName}.json`);
        return;
    }

    if (fmt === 'sql') {
        const tableName = baseName.split('_')[0].toLowerCase();
        const colDefs = keys.map((k, idx) => idx === 0 ? `\`${k}\` VARCHAR(120)` : `\`${k}\` TEXT`).join(', ');
        const lines = [
            `-- NH POS Module SQL Export: ${baseName}`,
            `CREATE TABLE IF NOT EXISTS \`${tableName}\` (${colDefs});`
        ];
        rows.forEach(r => {
            const vals = keys.map(k => sqlEscapeValue(r[k] !== undefined ? r[k] : '')).join(', ');
            lines.push(`INSERT INTO \`${tableName}\` (${keys.map(k => `\`${k}\``).join(', ')}) VALUES (${vals});`);
        });
        triggerBlobDownload(lines.join('\n'), 'application/sql;charset=utf-8;', `${baseName}.sql`);
        return;
    }

    let csv = keys.map(k => `"${k.toUpperCase()}"`).join(',') + '\n';
    rows.forEach(r => {
        const line = keys.map(k => {
            const v = r[k] !== undefined ? String(r[k]).replace(/"/g, '""') : '';
            return `"${v}"`;
        }).join(',');
        csv += line + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// Export Stock CSV
document.getElementById('btnExportStockCSV')?.addEventListener('click', () => {
    const activeCat = getActiveBackupCategory();
    const rows = allStock.map(s => {
        const ind = s.industryFields || {};
        return {
            name: s.name || '',
            brandCompany: s.brandCompany || ind.brandCompany || s.supplierName || '',
            category: s.category || 'General',
            barcode: s.barcode || '',
            qty: s.qty || 0,
            unit: s.unit || 'Unit',
            cartonPacking: s.cartonPacking || ind.cartonPacking || '',
            cost: s.purchaseRate || 0,
            tradePriceTP: s.tradePriceTP || ind.tradePriceTP || s.wholesaleRate || 0,
            retailRate: s.retailRate || 0,
            bonusSchemeRule: s.bonusSchemeRule || ind.bonusSchemeRule || '',
            skuBatchCode: s.skuBatchCode || ind.skuBatchCode || s.batchNo || '',
            expiryDate: s.expiryDate || ind.expiryDate || ''
        };
    });
    downloadCSV(`Stock_List_${myAgencyId}_${activeCat}.csv`, ['name', 'brandCompany', 'category', 'barcode', 'qty', 'unit', 'cartonPacking', 'cost', 'tradePriceTP', 'retailRate', 'bonusSchemeRule', 'skuBatchCode', 'expiryDate'], rows);
});

// Export Customers CSV
document.getElementById('btnExportCustCSV')?.addEventListener('click', () => {
    const activeCat = getActiveBackupCategory();
    const rows = allCustomers.map(c => ({
        name: c.name || '',
        shopName: c.shopName || '',
        segment: c.custSubCategory || c.subCategory || '',
        weeklyRoutePJP: c.affiliatedBoard || c.route || '',
        mobile: c.mobile || '',
        balance: c.balance || 0
    }));
    downloadCSV(`Customers_Khata_${myAgencyId}_${activeCat}.csv`, ['name', 'shopName', 'segment', 'weeklyRoutePJP', 'mobile', 'balance'], rows);
});

// Export Bills CSV
document.getElementById('btnExportBillsCSV')?.addEventListener('click', () => {
    const activeCat = getActiveBackupCategory();
    const rows = allBills.map(b => ({
        date: b.date || '',
        billNo: b.billNo || '',
        customer: b.customerName || 'Counter',
        total: b.grandTotal || b.billAmount || 0,
        received: b.received || b.paidAmount || 0,
        balance: b.balance || 0,
        paymentMode: b.paymentMode || 'cash',
        bookerName: b.bookerName || ''
    }));
    downloadCSV(`Sales_Bills_Register_${myAgencyId}_${activeCat}.csv`, ['date', 'billNo', 'customer', 'total', 'received', 'balance', 'paymentMode', 'bookerName'], rows);
});

// Export Booker Orders & Dispatch CSV
document.getElementById('btnExportOrdersCSV')?.addEventListener('click', () => {
    const activeCat = getActiveBackupCategory();
    const rows = allOrders.map(o => ({
        date: o.date || '',
        orderNo: o.orderNo || o.id || '',
        customer: o.customerName || '',
        bookerName: o.bookerName || '',
        total: o.grandTotal || 0,
        status: o.status || 'pending'
    }));
    downloadCSV(`Orders_Dispatch_${myAgencyId}_${activeCat}.csv`, ['date', 'orderNo', 'customer', 'bookerName', 'total', 'status'], rows);
});

// Export Expenses & Staff Payroll CSV
document.getElementById('btnExportExpensesCSV')?.addEventListener('click', () => {
    const activeCat = getActiveBackupCategory();
    const rows = allExpenses.map(e => ({
        date: e.date || '',
        category: e.categoryName || e.categoryId || 'Expense',
        title: e.title || e.staffName || '',
        amount: e.amount || 0,
        paymentMode: e.paymentMode || 'cash',
        payrollMonth: e.payrollMonth || ''
    }));
    downloadCSV(`Expenses_Payroll_${myAgencyId}_${activeCat}.csv`, ['date', 'category', 'title', 'amount', 'paymentMode', 'payrollMonth'], rows);
});

// Export Damage & Expiry Claims CSV
document.getElementById('btnExportClaimsCSV')?.addEventListener('click', () => {
    const activeCat = getActiveBackupCategory();
    const rows = allDamageClaims.map(c => ({
        voucherNo: c.voucherNo || '',
        date: c.incidentDate || '',
        itemName: c.itemName || '',
        supplier: c.supplierName || '',
        category: c.category || '',
        qty: c.qty || 0,
        totalLoss: c.totalLoss || c.lossAmount || 0,
        recoveredAmount: c.recoveredAmount || 0,
        status: c.status || 'pending'
    }));
    downloadCSV(`Damage_Expiry_Claims_${myAgencyId}_${activeCat}.csv`, ['voucherNo', 'date', 'itemName', 'supplier', 'category', 'qty', 'totalLoss', 'recoveredAmount', 'status'], rows);
});

// Export Delivery & Sale Returns CSV
document.getElementById('btnExportReturnsCSV')?.addEventListener('click', () => {
    const activeCat = getActiveBackupCategory();
    const rows = allStockReturns.map(r => ({
        returnNo: r.returnNo || r.id || '',
        date: r.date || '',
        customerName: r.customerName || '',
        itemName: r.itemName || '',
        qty: r.qty || 0,
        totalAmount: r.totalAmount || 0,
        reason: r.reason || ''
    }));
    downloadCSV(`Sale_Returns_${myAgencyId}_${activeCat}.csv`, ['returnNo', 'date', 'customerName', 'itemName', 'qty', 'totalAmount', 'reason'], rows);
});

// Export Stock Movements CSV
document.getElementById('btnExportMovementsCSV')?.addEventListener('click', () => {
    const activeCat = getActiveBackupCategory();
    const rows = allMovements.map(m => ({
        date: m.date || '',
        itemName: m.itemName || '',
        type: m.type || '',
        qty: m.qty || 0,
        note: m.note || ''
    }));
    downloadCSV(`Stock_Movements_${myAgencyId}_${activeCat}.csv`, ['date', 'itemName', 'type', 'qty', 'note'], rows);
});

// Export Staff & Payroll Profiles CSV
document.getElementById('btnExportPayrollCSV')?.addEventListener('click', () => {
    const activeCat = getActiveBackupCategory();
    const rows = allPayrollProfiles.map(p => ({
        name: p.name || '',
        role: p.role || 'staff',
        mobile: p.mobile || '',
        baseSalary: p.baseSalary || 0,
        commissionPct: p.commissionPct || 0,
        monthlyTarget: p.monthlyTarget || 0
    }));
    downloadCSV(`Staff_Payroll_Profiles_${myAgencyId}_${activeCat}.csv`, ['name', 'role', 'mobile', 'baseSalary', 'commissionPct', 'monthlyTarget'], rows);
});

const bLogout = document.getElementById('logoutBtn');
if (bLogout) {
    bLogout.addEventListener('click', async () => {
        const res = await Swal.fire({
            title: ebT('Logout?', 'لاگ آؤٹ کریں؟'),
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: ebT('Yes', 'ہاں'),
            cancelButtonText: ebT('Cancel', 'منسوخ')
        });
        if (res.isConfirmed) {
            await auth.signOut();
            window.location.href = 'auth.html';
        }
    });
}

// ============================================
// 🔄 LIVE BILINGUAL INIT & SIDEBAR EVENT SYNC
// ============================================
if (typeof document !== 'undefined') {
    ebApplyBilingualDom(document);
    ebRefreshStaticSelects();
}

if (typeof window !== 'undefined' && !window.__ebBackupLangBound) {
    window.__ebBackupLangBound = true;
    window.addEventListener('eb-lang-changed', () => {
        ebApplyBilingualDom(document);
        ebRefreshStaticSelects();
        updateBackupStatusUI();
        if (lastStudioParsedPayload) {
            renderSQLStudioPreview(lastStudioParsedPayload);
        } else {
            ebRenderSQLStudioInitialState(studioWasCleared);
        }
    });
}
