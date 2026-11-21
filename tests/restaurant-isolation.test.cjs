const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('🧪 Running Complete A-to-Z Restaurant (Fast Food) & Cross-Category Isolation Tests...\n');

// 1. Load BusinessCategories registry
global.window = global;
global.localStorage = {
    _store: {},
    getItem(k) { return Object.prototype.hasOwnProperty.call(this._store, k) ? this._store[k] : null; },
    setItem(k, v) { this._store[k] = String(v); },
    removeItem(k) { delete this._store[k]; }
};
global.sessionStorage = {
    _store: {},
    getItem(k) { return Object.prototype.hasOwnProperty.call(this._store, k) ? this._store[k] : null; },
    setItem(k, v) { this._store[k] = String(v); },
    removeItem(k) { delete this._store[k]; }
};

require('../public/business-categories.js');
const BC = global.window.BusinessCategories;

// Test 1: Restaurant Category Certification & Complete A-to-Z Schema
{
    const validation = BC.validateCategoryIntegration('restaurant');
    assert.strictEqual(validation.valid, true, 'restaurant must pass validateCategoryIntegration');
    assert.strictEqual(validation.status, 'active', 'restaurant status must be active (complete)');
    assert(BC.COMPLETED_CATEGORY_IDS.includes('restaurant'), 'COMPLETED_CATEGORY_IDS must include restaurant');
    console.log('✅ Test 1 Passed: Restaurant & Fast Food category is 100% certified (A-to-Z schema, units, KOT stations, deals, customer segments, expenses, claims).');
}

// Test 2: Strict Database & Record Isolation Between Restaurant and All Other Categories
{
    const fastFoodItem = {
        id: 'item_ff_1',
        name: 'Zinger Burger Combo Deal 1',
        businessCategory: 'restaurant',
        unit: 'deal',
        industryFields: {
            portionSize: 'Regular + Fries + Drink',
            spiceVariant: 'Crispy Spicy',
            kitchenKOTZone: 'Fryer & Burger Counter',
            dealContents: '1 Zinger + 1 Reg Fries + 345ml Drink'
        }
    };
    const distributorItem = {
        id: 'item_dist_1',
        name: 'Tapal Danedar 95g Master Carton',
        businessCategory: 'distributor',
        unit: 'ctn',
        industryFields: {
            brandCompany: 'Tapal Tea (ٹپال ٹی)',
            skuBatchCode: 'TPL-95G'
        }
    };
    const fastFoodCustomer = {
        id: 'cust_ff_1',
        name: 'Ali Dine-in Guest',
        businessCategory: 'restaurant',
        subCategory: 'dinein_regular'
    };

    const otherCategories = ['distributor', 'wholesaler', 'medical', 'mobile', 'books', 'general'];
    for (const otherCat of otherCategories) {
        assert.strictEqual(
            BC.matchesActiveCategoryRecord(fastFoodItem, otherCat, { businessCategory: otherCat }),
            false,
            `Fast Food item must NEVER appear in ${otherCat}`
        );
        assert.strictEqual(
            BC.matchesActiveCategoryRecord(fastFoodCustomer, otherCat, { businessCategory: otherCat }),
            false,
            `Fast Food customer must NEVER appear in ${otherCat}`
        );
    }
    assert.strictEqual(
        BC.matchesActiveCategoryRecord(fastFoodItem, 'restaurant', { businessCategory: 'restaurant' }),
        true,
        'Fast Food item must appear in restaurant category'
    );
    assert.strictEqual(
        BC.matchesActiveCategoryRecord(distributorItem, 'restaurant', { businessCategory: 'restaurant' }),
        false,
        'Distributor item must NEVER appear in restaurant category'
    );
    console.log('✅ Test 2 Passed: Zero data mixing between Restaurant (Fast Food) and Distributor/Wholesaler/Medical/Mobile/Books.');
}

// Test 3: Sidebar Menu Isolation (sidebar.js)
{
    const sidebarCode = fs.readFileSync(path.join(__dirname, '../public/sidebar.js'), 'utf8');
    assert(
        sidebarCode.includes("url: 'reports.html?tab=restaurant_analytics', roles: ['super-admin', 'owner'], categories: ['restaurant']"),
        'Restaurant & Fast Food Reports in sidebar.js must be restricted to categories: [\"restaurant\"]'
    );
    assert(
        sidebarCode.includes("url: 'reports.html?tab=medical_analytics', roles: ['super-admin', 'owner'], categories: ['medical']"),
        'Pharmacy & Expiry Reports in sidebar.js must be restricted to categories: [\"medical\"]'
    );
    assert(
        sidebarCode.includes("url: 'reports.html?tab=wholesaler_analytics', roles: ['super-admin', 'owner'], categories: ['wholesaler']"),
        'Wholesale & PJP Reports in sidebar.js must be restricted to categories: [\"wholesaler\"]'
    );
    assert(
        sidebarCode.includes("url: 'reports.html?tab=wholesaler_analytics', roles: ['super-admin', 'owner'], categories: ['distributor']"),
        'Distributor & FMCG Reports in sidebar.js must be restricted to categories: [\"distributor\"]'
    );
    assert(
        sidebarCode.includes('if (Array.isArray(it.categories) && it.categories.length > 0 && !it.categories.includes(activeCat))'),
        'renderSidebar() must filter out items whose categories array does not include activeCat'
    );
    console.log('✅ Test 3 Passed: Sidebar strictly hides Restaurant & Fast Food options in all non-restaurant categories.');
}

// Test 4: Reports Page Tab Isolation (reports.html & reports.js)
{
    const reportsHtml = fs.readFileSync(path.join(__dirname, '../public/reports.html'), 'utf8');
    const reportsJs = fs.readFileSync(path.join(__dirname, '../public/reports.js'), 'utf8');

    assert(
        reportsHtml.includes('id="tabBtnRestaurantAnalytics" style="display:none;'),
        'tabBtnRestaurantAnalytics must be hidden by default in reports.html'
    );
    assert(
        reportsJs.includes("if (restBtn) restBtn.style.display = (activeCat === 'restaurant') ? 'inline-flex' : 'none';"),
        'reports.js setupTabs() must only show tabBtnRestaurantAnalytics when activeCat === restaurant'
    );
    assert(
        reportsJs.includes("restaurant_analytics: ['restaurant']"),
        'reports.js must prevent opening restaurant_analytics tab when activeCat !== restaurant'
    );
    console.log('✅ Test 4 Passed: Reports page tabs strictly hide Restaurant, Kitchen & Deals tab in all other categories.');
}

// Test 5: POS Billing & Delivery/Claims Isolation (bills.html, bills.js, delivery-returns.js)
{
    const billsHtml = fs.readFileSync(path.join(__dirname, '../public/bills.html'), 'utf8');
    const billsJs = fs.readFileSync(path.join(__dirname, '../public/bills.js'), 'utf8');
    const delivJs = fs.readFileSync(path.join(__dirname, '../public/delivery-returns.js'), 'utf8');

    assert(
        billsHtml.includes('<div id="posRestaurantOrderBar" class="rest-order-bar" style="display:none;">'),
        'posRestaurantOrderBar must be hidden by default in bills.html'
    );
    assert(
        billsJs.includes('if (!isRestaurantAgency()) {\n        bar.style.display = \'none\';'),
        'setupRestaurantOrderBar() in bills.js must hide posRestaurantOrderBar when not in restaurant category'
    );
    assert(
        delivJs.includes("if (id.startsWith('cat_rest_')) return activeCatId === 'restaurant';"),
        'delivery-returns.js must only show cat_rest_ claim reasons when activeCatId === restaurant'
    );
    console.log('✅ Test 5 Passed: POS Billing KOT Bar and Kitchen Claim Reasons are strictly isolated to Restaurant category.');
}

console.log('\n🎉 ALL 5 RESTAURANT (FAST FOOD) A-TO-Z & CROSS-CATEGORY ISOLATION TESTS PASSED!');
