// ============================================
// 🎨 EASY BILL GENERATOR — BILL TEMPLATES (v1)
// ✅ 5 Professional Templates:
//    T1: 🇵🇰 Urdu Classic (Nastaliq!)
//    T2: 📋 Traders English (Big Header)
//    T3: 🇵🇰 Urdu + English Mix
//    T4: ⚡ Modern Minimal (Default)
//    T5: 💎 Premium Full (Sab kuch!)
// ✅ Har template: Print/PDF/JPG/Share ke sath!
// ============================================

// ============================================
// 🎨 URDU FONT (Nastaliq!)
// ============================================
function getUrduFontCSS() {
    return `
    @import url('https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap');
    .urdu-text { 
        font-family: 'Noto Nastaliq Urdu', serif; 
        direction: rtl; 
        line-height: 2.2;
    }
    `;
}

// ============================================
// 🎯 SHARED DATA HELPERS
// ============================================
function getTemplateAgency(agency, bill) {
    const ag = agency || {};
    const b = bill || {};
    return {
        name: ag.name || b.agencyName || 'NH POS',
        tagline: ag.tagline || ag.slogan || b.agencyTagline || '',
        ownerName: ag.ownerName || ag.proprietor || b.agencyOwner || '',
        mobile: ag.mobile || ag.ownerMobile || b.agencyMobile || '',
        mobile2: ag.mobile2 || ag.phone || b.agencyPhone || '',
        phone: ag.phone || b.agencyPhone || '',
        address: ag.address || b.agencyAddress || '',
        city: ag.city || b.agencyCity || '',
        ntn: ag.ntn || b.agencyNtn || '',
        licenceNo: ag.licenceNo || ag.licenseNo || ag.regNo || b.agencyLicence || '',
        strn: ag.strn || b.agencyStrn || '',
        logo: ag.logoBase64 || ag.logo || b.agencyLogo || null,
        invoiceFooter: ag.invoiceFooter || b.invoiceFooter || '',
        terminalId: ag.terminalId || 'DESKTOP-POS-01'
    };
}

function getTemplateCustomer(bill) {
    const b = bill || {};
    const ntnVal = b.customerNtn || b.custNTN || b.customerNTN || (b.customer && (b.customer.ntn || b.customer.customerNtn)) || '';
    const fbrStatusVal = b.customerFbrStatus || (b.customer && b.customer.fbrStatus) || (ntnVal ? 'filer' : 'non-filer');
    return {
        id: b.customerId || '',
        code: b.customerId ? b.customerId.slice(-4) : (b.customerCode || '101'),
        name: b.customerName || (b.customer && b.customer.name) || 'Counter Sale',
        shopName: b.customerShopName || (b.customer && b.customer.shopName) || '',
        mobile: b.customerMobile || (b.customer && b.customer.mobile) || '',
        address: b.customerAddress || (b.customer && b.customer.address) || '',
        route: b.customerRoute || (b.customer && b.customer.route) || '',
        city: b.customerCity || (b.customer && b.customer.city) || '',
        area: b.customerArea || b.customerRoute || (b.customer && (b.customer.area || b.customer.route)) || '',
        terms: b.customerTerms || (b.customer && b.customer.paymentTerms) || '',
        ntn: ntnVal,
        fbrStatus: fbrStatusVal,
        isFiler: fbrStatusVal === 'filer',
        cnic: b.customerCnic || (b.customer && b.customer.cnic) || ''
    };
}

function getTemplateItems(bill) {
    return (bill.items || []).map((it, i) => ({
        sno: i + 1,
        name: it.name,
        qty: it.qty,
        rate: it.rate,
        total: (it.total || 0).toFixed(2)
    }));
}

function getTemplateTotals(bill) {
    return {
        subTotal: (bill.subTotal || 0).toFixed(2),
        discount: (bill.discount || 0).toFixed(2),
        grandTotal: (bill.grandTotal || 0).toFixed(2),
        prevBalance: (bill.previousBalance || 0).toFixed(2),
        received: (bill.received || 0).toFixed(2),
        balance: (bill.balance || 0).toFixed(2)
    };
}

// ============================================
// 🎨 TEMPLATE 1: 🇵🇰 URDU CLASSIC (Nastaliq!)
// DigiKhata-style — Urdu header, seedhi layout
// ============================================
function template1Urdu(bill, agency, customer, settings) {
    const s = settings || (window.ebPrintEngine ? window.ebPrintEngine.getEffectivePrintSettings(agency) : {});
    const items = getTemplateItems(bill);
    const tot = getTemplateTotals(bill);
    const dateStr = bill.date || '-';
    const timeStr = bill.time || '-';
    const bookerName = bill.bookerName || bill.salesmanName || '';
    const bookerMobile = bill.bookerMobile || '';
    const custDisplayName = customer.shopName ? `${customer.shopName} (${customer.name})` : (customer.name || 'Counter Sale');

    return `
    <html>
    <head>
        <title>${bill.billNo}</title>
        <style>
            ${getUrduFontCSS()}
            body { 
                font-family: 'Segoe UI', Arial, sans-serif; 
                padding: 20px; max-width: 650px; margin: auto; color: #333;
            }
            .urdu-main {
                background: #fff;
                padding: 20px;
                border: 2px solid #333;
                border-radius: 8px;
            }
            .urdu-header {
                text-align: center;
                border-bottom: 3px double #333;
                padding-bottom: 15px;
                margin-bottom: 15px;
            }
            .urdu-title {
                font-family: 'Noto Nastaliq Urdu', serif;
                font-size: 28px;
                font-weight: 700;
                color: #1a1a1a;
                margin: 0;
                line-height: 1.8;
            }
            .urdu-subtitle {
                font-family: 'Noto Nastaliq Urdu', serif;
                font-size: 14px;
                color: #555;
                margin: 5px 0;
            }
            .cash-tag {
                font-size: 22px;
                font-weight: bold;
                color: #2c3e50;
                letter-spacing: 3px;
                text-align: right;
                margin-top: -40px;
            }
            .urdu-info-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 8px 20px;
                font-family: 'Noto Nastaliq Urdu', serif;
                font-size: 14px;
                border: 1px solid #555;
                padding: 12px;
                border-radius: 6px;
                margin-bottom: 15px;
            }
            .urdu-info-item {
                display: flex;
                justify-content: space-between;
                gap: 10px;
                border-bottom: 1px dotted #999;
                padding: 3px 0;
            }
            .urdu-info-label { color: #555; }
            .urdu-info-value { color: #1a1a1a; font-weight: bold; }
            table {
                width: 100%;
                border-collapse: collapse;
                margin: 15px 0;
                font-family: 'Noto Nastaliq Urdu', serif;
            }
            th, td {
                border: 1px solid #444;
                padding: 6px 8px;
                text-align: center;
                font-size: 13px;
            }
            th { background: #f0f0f0; font-weight: bold; }
            td.name { text-align: right; }
            .urdu-totals {
                font-family: 'Noto Nastaliq Urdu', serif;
                margin-top: 15px;
            }
            .urdu-total-row {
                display: flex;
                justify-content: space-between;
                padding: 5px 15px;
                font-size: 15px;
            }
            .urdu-total-row.grand {
                border-top: 2px solid #333;
                font-weight: bold;
                font-size: 17px;
                background: #f9f9f9;
            }
            .urdu-total-row.bal { color: #c0392b; font-weight: bold; }
            .urdu-footer {
                text-align: center;
                font-family: 'Noto Nastaliq Urdu', serif;
                font-size: 12px;
                color: #666;
                margin-top: 20px;
                border-top: 1px solid #ccc;
                padding-top: 10px;
                line-height: 2;
            }
            .sig-area {
                margin-top: 40px;
                display: flex;
                justify-content: space-between;
                font-family: 'Noto Nastaliq Urdu', serif;
            }
            .sig-box {
                border-top: 1px solid #333;
                width: 140px;
                text-align: center;
                padding-top: 5px;
                font-size: 13px;
            }
        </style>
    </head>
    <body>
        <div class="urdu-main">
            <div class="urdu-header">
                ${(s.showLogo !== false && agency.logo) ? `<div style="text-align:center; margin-bottom:8px;"><img src="${agency.logo}" style="max-height:55px; max-width:140px; object-fit:contain;"></div>` : ''}
                ${s.showAgencyName ? `<h1 class="urdu-title">${agency.name}</h1>` : ''}
                ${s.showAddress && agency.address ? `<p class="urdu-subtitle">${agency.address} ${agency.city ? ', ' + agency.city : ''}</p>` : ''}
                <div class="urdu-subtitle" style="font-size:12px; font-weight:bold;">
                    ${s.showMobiles && agency.mobile ? `<span>📱 ${agency.mobile}</span>` : ''}
                    ${s.showNTN && agency.ntn ? `&nbsp;|&nbsp; <span>NTN: ${agency.ntn}</span>` : ''}
                    ${s.showLicence && agency.licenceNo ? `&nbsp;|&nbsp; <span>Licence: ${agency.licenceNo}</span>` : ''}
                </div>
                ${s.showOwnerName && agency.ownerName ? `<p class="urdu-subtitle" style="font-size:12px;">👤 ${agency.ownerName}</p>` : ''}
                ${s.showPayType ? `<div class="cash-tag">${bill.payType || 'CASH'}</div>` : ''}
            </div>

            <div class="urdu-info-grid">
                ${s.showBillNo ? `<div class="urdu-info-item"><span class="urdu-info-label">بل نمبر:</span><span class="urdu-info-value">${bill.billNo}</span></div>` : ''}
                ${s.showDate ? `<div class="urdu-info-item"><span class="urdu-info-label">تاریخ:</span><span class="urdu-info-value">${dateStr} ${s.showTime ? timeStr : ''}</span></div>` : ''}
                ${s.showCustomerName ? `<div class="urdu-info-item"><span class="urdu-info-label">گاہک کا نام:</span><span class="urdu-info-value">${custDisplayName}</span></div>` : ''}
                ${s.showCustomerPhone ? `<div class="urdu-info-item"><span class="urdu-info-label">موبائل:</span><span class="urdu-info-value">${customer.mobile || '—'}</span></div>` : ''}
                ${s.showCustomerAddress ? `<div class="urdu-info-item"><span class="urdu-info-label">پتہ:</span><span class="urdu-info-value">${customer.address || '—'}</span></div>` : ''}
                ${s.showCustomerRoute ? `<div class="urdu-info-item"><span class="urdu-info-label">روٹ:</span><span class="urdu-info-value">${customer.route || bill.customerRoute || '—'}</span></div>` : ''}
                ${s.showCustomerNTN ? `<div class="urdu-info-item"><span class="urdu-info-label">گاہک NTN:</span><span class="urdu-info-value">${customer.ntn || '—'} <small style="font-weight:bold; margin-right:4px;">(${customer.isFiler ? '🟢 فائلر' : '🔴 نان فائلر'})</small></span></div>` : ''}
                ${s.showBookerName && bookerName ? `<div class="urdu-info-item"><span class="urdu-info-label">سیلزمین / بکر:</span><span class="urdu-info-value">${bookerName} ${bookerMobile}</span></div>` : ''}
            </div>

            <table>
                <tr>
                    <th>نمبر</th>
                    <th>تفصیل</th>
                    <th>تعداد</th>
                    <th>ریٹ</th>
                    <th>کل قیمت</th>
                </tr>
                ${items.map(it => `
                <tr>
                    <td>${it.sno}</td>
                    <td class="name">${it.name}</td>
                    <td>${it.qty}</td>
                    <td>Rs ${it.rate}</td>
                    <td>Rs ${it.total}</td>
                </tr>`).join('')}
            </table>

            <div class="urdu-totals">
                <div class="urdu-total-row">
                    <span>ٹوٹل رقم:</span>
                    <span>Rs ${tot.subTotal}</span>
                </div>
                ${parseFloat(tot.discount) > 0 ? `
                <div class="urdu-total-row">
                    <span>ڈسکاؤنٹ:</span>
                    <span>Rs ${tot.discount}</span>
                </div>` : ''}
                ${(s.showTax && (bill.taxAmount > 0 || (bill.taxRate && bill.taxRate > 0))) ? `
                <div class="urdu-total-row">
                    <span>FBR ایڈوانس ٹیکس (${customer.isFiler ? 'فائلر' : 'نان فائلر'} ${bill.taxRate ? bill.taxRate + '%' : ''}):</span>
                    <span>+ Rs ${parseFloat(bill.taxAmount || 0).toFixed(2)}</span>
                </div>` : ''}
                <div class="urdu-total-row grand">
                    <span>کل واجب الادا:</span>
                    <span>Rs ${tot.grandTotal}</span>
                </div>
                ${s.showPreviousBalance !== false && parseFloat(tot.prevBalance) > 0 ? `
                <div class="urdu-total-row">
                    <span>سابقہ بقایا:</span>
                    <span>Rs ${tot.prevBalance}</span>
                </div>` : ''}
                ${s.showReceivedAmount !== false && parseFloat(tot.received) > 0 ? `
                <div class="urdu-total-row">
                    <span>وصول شدہ:</span>
                    <span>Rs ${tot.received}</span>
                </div>` : ''}
                ${s.showBalance !== false ? `
                <div class="urdu-total-row bal">
                    <span>کل بقایا رقم:</span>
                    <span>Rs ${tot.balance}</span>
                </div>` : ''}
            </div>

            <div class="sig-area">
                <div class="sig-box">دستخط آرڈر بکر / سیلزمین</div>
                <div class="sig-box">دستخط گاہک / دکاندار</div>
                <div class="sig-box">دستخط برائے ادارہ</div>
            </div>

            <div class="urdu-footer">
                ${s.showTermsAndConditions !== false ? `
                مال موقع پر چیک کریں۔ بعد میں کمپنی ذمہ دار نہ ہوگی۔<br>
                ${agency.invoiceFooter ? agency.invoiceFooter + '<br>' : ''}` : ''}
                بل نمبر: ${bill.billNo} — NH POS
            </div>
        </div>
    </body>
    </html>
    `;
}

// ============================================
// 🎨 TEMPLATE 2: 📋 TRADERS ENGLISH (Big Header!)
// Usama Traders style — Bold company header
// ============================================
function template2Traders(bill, agency, customer, settings) {
    const s = settings || (window.ebPrintEngine ? window.ebPrintEngine.getEffectivePrintSettings(agency) : {});
    const items = getTemplateItems(bill);
    const tot = getTemplateTotals(bill);
    const dateStr = bill.date || '-';
    const timeStr = bill.time || '-';
    const bookerName = bill.bookerName || bill.salesmanName || '';
    const bookerMobile = bill.bookerMobile || '';
    const custDisplayName = customer.shopName ? `${customer.shopName} (${customer.name})` : (customer.name || 'Counter Sale');

    return `
    <html>
    <head>
        <title>${bill.billNo}</title>
        <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; max-width: 650px; margin: auto; color: #222; }
            .main-header {
                text-align: center;
                border-bottom: 4px solid #222;
                padding-bottom: 12px;
                margin-bottom: 8px;
            }
            .company-name {
                font-size: 34px;
                font-weight: 900;
                letter-spacing: 2px;
                color: #1a1a1a;
                margin: 0;
                text-transform: uppercase;
            }
            .company-sub {
                font-size: 13px;
                color: #555;
                margin: 4px 0 0;
            }
            .cash-tag {
                font-size: 22px;
                font-weight: 900;
                color: #1a1a1a;
                letter-spacing: 4px;
                text-align: right;
                margin: -35px 0 10px;
            }
            .top-info {
                display: flex;
                justify-content: space-between;
                font-size: 12.5px;
                margin-bottom: 14px;
                background: #f8fafc;
                padding: 10px 14px;
                border: 1px solid #cbd5e1;
                border-radius: 8px;
            }
            .top-info div { line-height: 1.6; }
            .top-info b { color: #000; }
            .items-table {
                width: 100%;
                border-collapse: collapse;
                margin: 10px 0;
                font-size: 13px;
            }
            .items-table th, .items-table td {
                border: 1px solid #333;
                padding: 6px 8px;
                text-align: left;
            }
            .items-table th { background: #f0f0f0; font-weight: bold; text-align: center; }
            .items-table td.num { text-align: right; }
            .summary-table {
                width: 340px;
                margin-left: auto;
                margin-top: 15px;
                font-size: 13px;
            }
            .summary-table div {
                display: flex;
                justify-content: space-between;
                padding: 4px 10px;
            }
            .summary-table .label { font-weight: bold; }
            .summary-table .grand {
                border-top: 2px solid #333;
                font-weight: bold;
                font-size: 15px;
                background: #f9f9f9;
            }
            .summary-table .net {
                font-weight: bold;
                border: 2px solid #333;
                font-size: 14px;
                background: #f0f0f0;
            }
            .sign-area {
                margin-top: 45px;
                display: flex;
                justify-content: space-between;
                font-size: 12.5px;
                font-weight: bold;
            }
            .sign-box {
                border-top: 2px solid #333;
                width: 150px;
                text-align: center;
                padding-top: 5px;
            }
            .footer {
                text-align: center;
                font-size: 10px;
                color: #666;
                margin-top: 25px;
                border-top: 1px solid #999;
                padding-top: 8px;
            }
        </style>
    </head>
    <body>
        <div class="main-header">
            ${(s.showLogo !== false && agency.logo) ? `<div style="margin-bottom:6px;"><img src="${agency.logo}" style="max-height:55px; max-width:140px; object-fit:contain;"></div>` : ''}
            ${s.showAgencyName ? `<h1 class="company-name">${agency.name}</h1>` : ''}
            ${s.showAddress && agency.address ? `<p class="company-sub">📍 ${agency.address} ${agency.city ? ', ' + agency.city : ''}</p>` : ''}
            <div class="company-sub" style="font-weight:bold;">
                ${s.showMobiles && agency.mobile ? `<span>📱 ${agency.mobile}</span>` : ''}
                ${s.showNTN && agency.ntn ? `&nbsp;|&nbsp; <span>NTN: ${agency.ntn}</span>` : ''}
                ${s.showLicence && agency.licenceNo ? `&nbsp;|&nbsp; <span>Licence: ${agency.licenceNo}</span>` : ''}
            </div>
            ${s.showOwnerName && agency.ownerName ? `<p class="company-sub">👤 Owner: ${agency.ownerName}</p>` : ''}
        </div>
        ${s.showPayType ? `<div class="cash-tag">${bill.payType || 'CASH'}</div>` : ''}

        <div class="top-info">
            <div>
                ${s.showCustomerName ? `<b>Customer:</b> ${custDisplayName}<br>` : ''}
                ${s.showCustomerAddress && customer.address ? `<b>Address:</b> ${customer.address}<br>` : ''}
                ${s.showCustomerPhone && customer.mobile ? `<b>Contacts:</b> ${customer.mobile}<br>` : ''}
                ${s.showCustomerRoute && customer.route ? `<b>Route:</b> ${customer.route}<br>` : ''}
                ${s.showCustomerNTN && (customer.ntn || customer.cnic) ? `<b>Customer NTN:</b> ${customer.ntn || customer.cnic} <small>(${customer.isFiler ? '🟢 FILER' : '🔴 NON-FILER'})</small>` : (customer.fbrStatus ? `<small>(${customer.isFiler ? '🟢 FILER' : '🔴 NON-FILER'})</small>` : '')}
            </div>
            <div style="text-align: right;">
                ${s.showBillNo ? `<b>Invoice No:</b> ${bill.billNo}<br>` : ''}
                ${s.showDate ? `<b>Inv. Date:</b> ${dateStr}<br>` : ''}
                ${s.showTime ? `<b>Time:</b> ${timeStr}<br>` : ''}
                ${s.showBookerName && bookerName ? `<b>Booker:</b> ${bookerName} ${bookerMobile ? '(' + bookerMobile + ')' : ''}<br>` : ''}
                ${bill.supplierName ? `<b>Supplier:</b> ${bill.supplierName}` : ''}
            </div>
        </div>

        <table class="items-table">
            <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Discount</th>
                <th>Net Total</th>
            </tr>
            ${items.map(it => `
            <tr>
                <td><b>${it.name}</b></td>
                <td style="text-align:center;">${it.qty}</td>
                <td class="num">Rs ${it.rate}</td>
                <td style="text-align:center;">-</td>
                <td class="num">Rs ${it.total}</td>
            </tr>`).join('')}
            <tr>
                <td colspan="4" style="text-align:right; font-weight:bold;">Gross Total:</td>
                <td class="num" style="font-weight:bold;">Rs ${tot.subTotal}</td>
            </tr>
        </table>

        <div class="summary-table">
            <div><span class="label">Gross Amount:</span><span>Rs ${tot.subTotal}</span></div>
            ${parseFloat(tot.discount) > 0 ? `<div><span class="label">Discount:</span><span>- Rs ${tot.discount}</span></div>` : ''}
            ${(s.showTax && (bill.taxAmount > 0 || (bill.taxRate && bill.taxRate > 0))) ? `<div><span class="label">FBR Advance Tax (${customer.isFiler ? 'Filer' : 'Non-Filer'} ${bill.taxRate ? bill.taxRate + '%' : ''}):</span><span>+ Rs ${parseFloat(bill.taxAmount || 0).toFixed(2)}</span></div>` : ''}
            <div class="net"><span class="label">Net Bill Amount:</span><span>Rs ${tot.grandTotal}</span></div>
            ${s.showPreviousBalance !== false && parseFloat(tot.prevBalance) > 0 ? `<div><span class="label">Previous Balance:</span><span>Rs ${tot.prevBalance}</span></div>` : ''}
            ${s.showReceivedAmount !== false && parseFloat(tot.received) > 0 ? `<div><span class="label">Received:</span><span>- Rs ${tot.received}</span></div>` : ''}
            <div class="net"><span class="label">Total Due / Balance:</span><span>Rs ${tot.balance}</span></div>
        </div>

        <div class="sign-area">
            <div class="sign-box">Prepared By (Booker)</div>
            <div class="sign-box">Authorized Signature</div>
            <div class="sign-box">Customer Signature</div>
        </div>

        <div class="footer">
            ${s.showTermsAndConditions !== false && agency.invoiceFooter ? agency.invoiceFooter + '<br>' : ''}
            (Sales &amp; Distribution App) Developed by NH POS
        </div>
    </body>
    </html>
    `;
}

// ============================================
// 🎨 TEMPLATE 3: 🇵🇰 URDU + ENGLISH MIX
// Taj Traders style — Urdu header + English data
// ============================================
function template3Mix(bill, agency, customer, settings) {
    const s = settings || (window.ebPrintEngine ? window.ebPrintEngine.getEffectivePrintSettings(agency) : {});
    const items = getTemplateItems(bill);
    const tot = getTemplateTotals(bill);
    const dateStr = bill.date || '-';
    const timeStr = bill.time || '-';
    const bookerName = bill.bookerName || bill.salesmanName || '';
    const bookerMobile = bill.bookerMobile || '';
    const custDisplayName = customer.shopName ? `${customer.shopName} (${customer.name})` : (customer.name || 'Counter Sale');

    return `
    <html>
    <head>
        <title>${bill.billNo}</title>
        <style>
            ${getUrduFontCSS()}
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; max-width: 650px; margin: auto; color: #222; }
            .main-header {
                text-align: center;
                border-bottom: 3px solid #222;
                padding-bottom: 10px;
                margin-bottom: 12px;
            }
            .urdu-company {
                font-family: 'Noto Nastaliq Urdu', serif;
                font-size: 28px;
                font-weight: 700;
                margin: 0;
                line-height: 1.8;
            }
            .eng-sub {
                font-size: 12.5px;
                color: #555;
                font-family: 'Segoe UI', Arial;
                margin: 3px 0;
            }
            .cash-tag {
                font-size: 22px;
                font-weight: 900;
                color: #1a1a1a;
                letter-spacing: 4px;
                text-align: right;
                margin: -40px 0 10px;
            }
            .info-row {
                display: flex;
                justify-content: space-between;
                font-size: 13px;
                margin-bottom: 10px;
                background: #f8fafc;
                padding: 10px 12px;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
            }
            .info-row .urdu-label {
                font-family: 'Noto Nastaliq Urdu', serif;
                font-weight: bold;
            }
            .items-table {
                width: 100%;
                border-collapse: collapse;
                margin: 12px 0;
                font-size: 13px;
            }
            .items-table th, .items-table td {
                border: 1px solid #333;
                padding: 6px 8px;
            }
            .items-table th { background: #f0f0f0; text-align: center; }
            .items-table td.name {
                font-family: 'Noto Nastaliq Urdu', serif;
                text-align: right;
            }
            .urdu-totals {
                margin-top: 10px;
                max-width: 350px;
                margin-left: auto;
            }
            .urdu-total-row {
                display: flex;
                justify-content: space-between;
                padding: 4px 10px;
                font-size: 13.5px;
            }
            .urdu-total-row .urdu-label {
                font-family: 'Noto Nastaliq Urdu', serif;
                font-weight: bold;
            }
            .urdu-total-row.grand {
                border-top: 2px solid #333;
                font-weight: bold;
                background: #f9f9f9;
            }
            .urdu-total-row.bal { color: #c0392b; font-weight: bold; }
            .urdu-terms {
                font-family: 'Noto Nastaliq Urdu', serif;
                font-size: 12px;
                margin-top: 20px;
                border: 1px solid #999;
                padding: 10px;
                border-radius: 6px;
                line-height: 2;
            }
            .sign-area {
                margin-top: 35px;
                display: flex;
                justify-content: space-between;
                font-family: 'Noto Nastaliq Urdu', serif;
            }
            .sign-box {
                border-top: 1px solid #333;
                width: 130px;
                text-align: center;
                padding-top: 5px;
            }
        </style>
    </head>
    <body>
        <div class="main-header">
            ${(s.showLogo !== false && agency.logo) ? `<div style="margin-bottom:6px;"><img src="${agency.logo}" style="max-height:55px; max-width:140px; object-fit:contain;"></div>` : ''}
            ${s.showAgencyName ? `<h1 class="urdu-company">${agency.name}</h1>` : ''}
            ${s.showAddress && agency.address ? `<p class="eng-sub">📍 ${agency.address} ${agency.city ? ', ' + agency.city : ''}</p>` : ''}
            <div class="eng-sub" style="font-weight:bold;">
                ${s.showMobiles && agency.mobile ? `<span>📱 ${agency.mobile}</span>` : ''}
                ${s.showNTN && agency.ntn ? `&nbsp;|&nbsp; <span>NTN: ${agency.ntn}</span>` : ''}
                ${s.showLicence && agency.licenceNo ? `&nbsp;|&nbsp; <span>Licence: ${agency.licenceNo}</span>` : ''}
            </div>
            ${s.showOwnerName && agency.ownerName ? `<p class="eng-sub">👤 Owner: ${agency.ownerName}</p>` : ''}
        </div>
        ${s.showPayType ? `<div class="cash-tag">${bill.payType || 'CASH'}</div>` : ''}

        <div class="info-row">
            <div>
                ${s.showCustomerName ? `<span class="urdu-label">گاہک کا نام:</span> <b>${custDisplayName}</b><br>` : ''}
                ${s.showCustomerPhone && customer.mobile ? `<span class="urdu-label">موبائل:</span> ${customer.mobile}<br>` : ''}
                ${s.showCustomerAddress && customer.address ? `<span class="urdu-label">پتہ:</span> ${customer.address}<br>` : ''}
                ${s.showCustomerRoute && customer.route ? `<span class="urdu-label">روٹ:</span> ${customer.route}<br>` : ''}
                ${s.showCustomerNTN && (customer.ntn || customer.cnic) ? `<span class="urdu-label">گاہک NTN:</span> ${customer.ntn || customer.cnic} <small>(${customer.isFiler ? '🟢 فائلر' : '🔴 نان فائلر'})</small>` : (customer.fbrStatus ? `<small>(${customer.isFiler ? '🟢 فائلر' : '🔴 نان فائلر'})</small>` : '')}
            </div>
            <div style="text-align: right;">
                ${s.showBillNo ? `<b>Bill No:</b> ${bill.billNo}<br>` : ''}
                ${s.showDate ? `<b>Date:</b> ${dateStr} ${s.showTime ? timeStr : ''}<br>` : ''}
                ${s.showBookerName && bookerName ? `<b>Booker:</b> ${bookerName} ${bookerMobile ? '(' + bookerMobile + ')' : ''}<br>` : ''}
                ${bill.supplierName ? `<b>Supplier:</b> ${bill.supplierName}` : ''}
            </div>
        </div>

        <table class="items-table">
            <tr>
                <th>تفصیل</th>
                <th>تعداد</th>
                <th>ریٹ</th>
                <th>کل قیمت</th>
            </tr>
            ${items.map(it => `
            <tr>
                <td class="name">${it.name}</td>
                <td style="text-align:center;">${it.qty}</td>
                <td style="text-align:center;">Rs ${it.rate}</td>
                <td style="text-align:center;">Rs ${it.total}</td>
            </tr>`).join('')}
            <tr>
                <td colspan="3" style="text-align:left; font-weight:bold;">
                    <span class="urdu-label" style="font-family:'Noto Nastaliq Urdu',serif;">ٹوٹل رقم:</span>
                </td>
                <td style="text-align:center; font-weight:bold;">Rs ${tot.subTotal}</td>
            </tr>
        </table>

        <div class="urdu-totals">
            ${parseFloat(tot.discount) > 0 ? `
            <div class="urdu-total-row">
                <span class="urdu-label">ڈسکاؤنٹ:</span>
                <span>- Rs ${tot.discount}</span>
            </div>` : ''}
            ${(s.showTax && (bill.taxAmount > 0 || (bill.taxRate && bill.taxRate > 0))) ? `
            <div class="urdu-total-row">
                <span class="urdu-label">FBR ٹیکس (${customer.isFiler ? 'فائلر' : 'نان فائلر'} ${bill.taxRate ? bill.taxRate + '%' : ''}):</span>
                <span>+ Rs ${parseFloat(bill.taxAmount || 0).toFixed(2)}</span>
            </div>` : ''}
            <div class="urdu-total-row grand">
                <span class="urdu-label">کل واجب الادا:</span>
                <span>Rs ${tot.grandTotal}</span>
            </div>
            ${s.showPreviousBalance !== false && parseFloat(tot.prevBalance) > 0 ? `
            <div class="urdu-total-row">
                <span class="urdu-label">سابقہ بقایا:</span>
                <span>Rs ${tot.prevBalance}</span>
            </div>` : ''}
            ${s.showReceivedAmount !== false && parseFloat(tot.received) > 0 ? `
            <div class="urdu-total-row">
                <span class="urdu-label">وصول شدہ:</span>
                <span>Rs ${tot.received}</span>
            </div>` : ''}
            ${s.showBalance !== false ? `
            <div class="urdu-total-row bal">
                <span class="urdu-label">کل بقایا:</span>
                <span>Rs ${tot.balance}</span>
            </div>` : ''}
        </div>

        <div class="urdu-terms">
            ${s.showTermsAndConditions !== false && agency.invoiceFooter ? agency.invoiceFooter : 'مال موقع پر چیک کریں۔ بعد میں کمپنی ذمہ دار نہ ہوگی۔'}
        </div>

        <div class="sign-area">
            <div class="sign-box">دستخط آرڈر بکر</div>
            <div class="sign-box">دستخط گاہک</div>
            <div class="sign-box">دستخط ادارہ</div>
        </div>
    </body>
    </html>
    `;
}

// ============================================
// 🎨 TEMPLATE 4: ⚡ MODERN MINIMAL (Default!)
// v4 — Title BIG + 👤 OWNER NAME (Title nechay!) + Line: Mobiles→NTN→Licence
// ============================================
function template4Modern(bill, agency, customer, settings) {
    const s = settings || (window.ebPrintEngine ? window.ebPrintEngine.getEffectivePrintSettings(agency) : {
        showLogo: true, showAgencyName: true, showOwnerName: true, showAddress: true, showMobiles: true,
        showNTN: true, showPayType: true, showBillNo: true, showDate: true, showTime: true,
        showCustomerName: true, showCustomerPhone: true, showCustomerAddress: true, showCustomerNTN: true,
        showItemSno: true, showItemName: true, showItemQty: true, showItemRate: true, showItemTotal: true,
        showSubTotal: true, showDiscount: true, showTax: true, showGrandTotal: true,
        showPreviousBalance: true, showReceivedAmount: true, showBalance: true,
        showThankYouNote: true, showSignatureAuthorized: true
    });

    const items = getTemplateItems(bill);
    const tot = getTemplateTotals(bill);
    const dateStr = bill.date || '-';
    const timeStr = bill.time || '-';
    const payType = bill.payType || (agency.payType || 'CASH');

    // 🏢 AGENCY DETAILS (Always preserved as requested!)
    const ownerNm = String(agency.ownerName || '').trim();
    const ownerMob = String(agency.ownerMobile || '').trim();
    const ownerBits = [];
    if (ownerNm) ownerBits.push(`👤 ${ownerNm}`);
    if (ownerMob) ownerBits.push(`📱 ${ownerMob}`);
    const ownerHTML = ownerBits.join('&nbsp;&nbsp;&nbsp;');
    
    // 📱 Mobiles
    const mobilesArr = [agency.mobile, agency.mobile2]
        .filter(m => m && String(m).trim())
        .map(m => `📱 ${String(m).trim()}`);

    // Contact line
    const contactBits = [];
    if (s.showMobiles && mobilesArr.length > 0) contactBits.push(mobilesArr.join('&nbsp;&nbsp;'));
    if (s.showNTN && agency.ntn && String(agency.ntn).trim()) contactBits.push(`🔢 NTN: ${agency.ntn}`);
    if (s.showNTN && agency.licenceNo && String(agency.licenceNo).trim()) contactBits.push(`📋 Licence: ${agency.licenceNo}`);
    const contactHTML = contactBits.join(' &nbsp;|&nbsp; ');

    // Address
    const addrParts = [agency.address, agency.city].filter(a => a && String(a).trim());
    const addrHTML = (s.showAddress && addrParts.length) ? `📍 ${addrParts.join(', ')}` : '';

    // 💰 Tax row
    const taxRow = (s.showTax && bill.taxAmount && bill.taxAmount > 0)
        ? `<div><span>FBR Advance Tax (${customer.isFiler ? 'Filer' : 'Non-Filer'} ${bill.taxRate ? bill.taxRate + '%' : ''}):</span><span>+ Rs ${parseFloat(bill.taxAmount).toFixed(2)}</span></div>`
        : '';

    return `
    <html>
    <head>
        <title>Bill ${bill.billNo}</title>
        <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; max-width: 650px; margin: auto; color: #333; }

            /* 🏢 AGENCY HEADER */
            .ag-header {
                display: flex;
                align-items: flex-start;
                border-bottom: 3px double #333;
                padding-bottom: 8px;
                margin-bottom: 12px;
            }
            .ag-logo { flex: 0 0 auto; display: flex; align-items: center; }
            .ag-logo img { width: 55px; height: 50px; object-fit: contain; }
            .ag-details { flex: 1; text-align: left; padding: 0 10px; min-width: 0; }

            /* 🏢 TITLE — BARA (24px) + auto-shrink! */
            .ag-name-row { white-space: nowrap; overflow: hidden; }
            .ag-name {
                font-size: 24px;
                font-weight: 900;
                color: #1a1a1a;
                letter-spacing: 0.3px;
                display: inline-block;
                max-width: 100%;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            /* 🆕 OWNER NAME line (Title nechay — bold!) */
            .ag-owner-line { font-size: 12.5px; color: #1a1a1a; font-weight: 800; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

            /* 📍 Choti line (Address+City) */
            .ag-sub-line { font-size: 10.5px; color: #555; font-weight: 600; margin-top: 2px; word-wrap: break-word; }

            /* 📱🔢 Contact LINE: Mobiles + NTN + Licence */
            .ag-contact-line {
                font-size: 11px;
                color: #333;
                font-weight: bold;
                margin-top: 3px;
                word-wrap: break-word;
            }

            /* 💳 PAY TYPE (right top — bold!) */
            .pay-type {
                flex: 0 0 auto;
                align-self: center;
                font-size: 22px;
                font-weight: 900;
                color: #1a1a1a;
                letter-spacing: 3px;
            }

            /* 🧾 BILL META (grey rounded — right side!) */
            .bill-meta-inner {
                background: #f8f9fa;
                border: 1px solid #e0e6e8;
                border-radius: 8px;
                padding: 8px 12px;
                font-size: 12px;
                line-height: 1.9;
                min-width: 160px;
            }
            .bill-meta-inner b { color: #2c3e50; }

            /* 👤 CUSTOMER BOX */
            .cust-box {
                background: #f8f9fa;
                border: 1px solid #e0e6e8;
                border-radius: 8px;
                padding: 10px 14px;
                margin-bottom: 12px;
                font-size: 13px;
                display: flex;
                gap: 15px;
                flex-wrap: wrap;
                align-items: flex-start;
            }
            .cust-left { flex: 1; min-width: 200px; line-height: 1.8; }
            .cust-right {
                flex: 0 0 auto;
                text-align: left;
                border-left: 1px dashed #bbb;
                padding-left: 15px;
            }
            .cust-name-big { font-size: 15px; font-weight: bold; color: #1a1a1a; }
            .cust-addr { color: #444; word-wrap: break-word; max-width: 320px; display: inline; }
            .cust-label { font-size: 11px; color: #7f8c8d; font-weight: bold; }
            .dim-value { color: #222; font-weight: 600; }

            /* 📋 ITEMS TABLE */
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th, td { border: 1px solid #444; padding: 7px 8px; text-align: left; font-size: 13px; }
            th { background: #f0f0f0; text-align: center; }
            td.qty, td.rate, td.total { text-align: right; }

            /* 💰 TOTALS */
            .totals {
                margin-top: 12px;
                max-width: 340px;
                margin-left: auto;
                background: #fafbfc;
                border: 1px solid #e0e6e8;
                border-radius: 8px;
                padding: 8px 15px;
            }
            .totals div { display: flex; justify-content: space-between; align-items: center; padding: 5px 0; font-size: 14px; }
            .totals .grand { border-top: 2px solid #333; font-weight: bold; font-size: 15px; }
            .totals .bal { color: #c0392b; font-weight: bold; }

            .thanks { text-align: center; font-weight: bold; margin-top: 15px; color: #2c3e50; }
            .sig-area { margin-top: 40px; text-align: right; }
            .sig-line { border-top: 1px solid #333; width: 160px; display: inline-block; padding-top: 5px; font-weight: bold; }
            .footer-note { text-align: center; font-size: 10px; color: #888; margin-top: 25px; font-style: italic; }
        </style>
    </head>
    <body>
        <!-- 🏢 AGENCY HEADER (Title → OWNER → Address → Mobiles+NTN+Licence) -->
        <div class="ag-header">
            ${s.showLogo && agency.logo ? `<div class="ag-logo"><img src="${agency.logo}"></div>` : ''}
            <div class="ag-details">
                ${s.showAgencyName ? `<div class="ag-name-row"><span class="ag-name" id="agName">${agency.name}</span></div>` : ''}
                ${s.showOwnerName && ownerHTML ? `<div class="ag-owner-line">${ownerHTML}</div>` : ''}
                ${addrHTML ? `<div class="ag-sub-line">${addrHTML}</div>` : ''}
                ${contactHTML ? `<div class="ag-contact-line">${contactHTML}</div>` : ''}
            </div>
            ${s.showPayType ? `<div class="pay-type">${payType}</div>` : ''}
        </div>

        <!-- 👤 CUSTOMER BOX -->
        <div class="cust-box">
            <div class="cust-left">
                ${s.showCustomerName ? `<span class="cust-label">👤 Customer:</span><span class="cust-name-big"> ${customer.shopName ? customer.shopName + ' (' + customer.name + ')' : customer.name}</span>` : ''}
                ${s.showCustomerPhone && customer.mobile ? `<span> &nbsp; 📱 ${customer.mobile}</span>` : ''}
                ${s.showCustomerAddress && customer.address ? `<br><span class="cust-label">📍 Address:</span> <span class="cust-addr"> ${customer.address}</span>` : ''}
                ${s.showCustomerRoute && customer.route ? `<br><span class="cust-label">🛣️ Route:</span> <span class="dim-value"> ${customer.route}</span>` : ''}
                ${s.showCustomerNTN && (customer.ntn || customer.cnic) ? `
                <br><span class="cust-label">🔢 Customer NTN:</span> <span class="dim-value"> ${customer.ntn || customer.cnic}</span>
                <span style="font-size:10px; font-weight:800; padding:1px 6px; border-radius:4px; margin-left:4px; ${customer.isFiler ? 'background:#dcfce7; color:#15803d; border:1px solid #86efac;' : 'background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5;'}">(${customer.isFiler ? '🟢 FILER' : '🔴 NON-FILER'})</span>` : (customer.fbrStatus ? `<span style="font-size:10px; font-weight:800; padding:1px 6px; border-radius:4px; margin-left:4px; ${customer.isFiler ? 'background:#dcfce7; color:#15803d; border:1px solid #86efac;' : 'background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5;'}">(${customer.isFiler ? '🟢 FILER' : '🔴 NON-FILER'})</span>` : '')}
            </div>
            <div class="cust-right">
                <div class="bill-meta-inner">
                    ${s.showBillNo ? `<b>🧾 Bill No:</b> ${bill.billNo}<br>` : ''}
                    ${s.showDate ? `<b>📅 Date:</b> ${dateStr}<br>` : ''}
                    ${s.showTime ? `<b>🕐 Time:</b> ${timeStr}<br>` : ''}
                    ${s.showBookerName && (bill.bookerName || bill.salesmanName) ? `<b>🚴 Booker:</b> ${bill.bookerName || bill.salesmanName} ${bill.bookerMobile ? '(' + bill.bookerMobile + ')' : ''}<br>` : ''}
                    ${bill.supplierName ? `<b>🏢 Supplier:</b> ${bill.supplierName}` : ''}
                </div>
            </div>
        </div>

        <table>
            <tr>
                ${s.showItemSno ? '<th>#</th>' : ''}
                <th>Item</th>
                ${s.showItemQty ? '<th>Qty</th>' : ''}
                ${s.showItemRate ? '<th>Rate</th>' : ''}
                ${s.showItemTotal ? '<th>Total</th>' : ''}
            </tr>
            ${items.map(it => `
                <tr>
                    ${s.showItemSno ? `<td>${it.sno}</td>` : ''}
                    <td>${it.name}</td>
                    ${s.showItemQty ? `<td class="qty">${it.qty}</td>` : ''}
                    ${s.showItemRate ? `<td class="rate">Rs ${it.rate}</td>` : ''}
                    ${s.showItemTotal ? `<td class="total">Rs ${it.total}</td>` : ''}
                </tr>`).join('')}
        </table>

        <div class="totals">
            ${s.showSubTotal ? `<div><span>Sub Total:</span><span>Rs ${tot.subTotal}</span></div>` : ''}
            ${s.showDiscount && parseFloat(tot.discount) > 0 ? `<div><span>Discount:</span><span>- Rs ${tot.discount}</span></div>` : ''}
            ${taxRow}
            ${s.showGrandTotal ? `<div class="grand"><span>Grand Total:</span><span>Rs ${tot.grandTotal}</span></div>` : ''}
            ${s.showPreviousBalance && parseFloat(tot.prevBalance) > 0 ? `<div><span>Previous Balance:</span><span>Rs ${tot.prevBalance}</span></div>` : ''}
            ${s.showReceivedAmount ? `<div><span>Received:</span><span>- Rs ${tot.received}</span></div>` : ''}
            ${s.showBalance ? `<div class="bal"><span>TOTAL BALANCE:</span><span>Rs ${tot.balance}</span></div>` : ''}
        </div>

        ${s.showThankYouNote ? '<div class="thanks">🙏 Shukriya! Dobara tashreef layen!</div>' : ''}

        ${s.showSignatureAuthorized ? `
        <div class="sig-area">
            <div class="sig-line">Authorized Signature</div>
        </div>` : ''}

        <div class="footer-note">Bill ${bill.billNo} — NH POS se generate hua hai.</div>

        <!-- 🌟 AUTO-SHRINK (24px se shuru — naam lamba to chota!) -->
        <script>
            (function() {
                function fitName() {
                    try {
                        var nameEl = document.getElementById('agName');
                        if (!nameEl) return;
                        var size = 24;
                        nameEl.style.fontSize = size + 'px';
                        var guard = 0;
                        while (nameEl.scrollWidth > nameEl.clientWidth && size > 10 && guard < 50) {
                            size -= 0.5;
                            nameEl.style.fontSize = size + 'px';
                            guard++;
                        }
                    } catch (e) {}
                }
                window.addEventListener('load', fitName);
                setTimeout(fitName, 100);
            })();
        <\/script>
    </body>
    </html>
    `;
}

// ============================================
// 🎨 TEMPLATE 5: 💎 PREMIUM FULL (Sab Kuch!)
// Logo + Urdu + English + Salesman + Bonus + Pack detail
// ============================================
function template5Premium(bill, agency, customer) {
    const items = getTemplateItems(bill);
    const tot = getTemplateTotals(bill);
    const dateStr = bill.date || '-';
    const timeStr = bill.time || '-';
    const logoHtml = agency.logo 
        ? `<img src="${agency.logo}" style="max-width:100px; max-height:100px; margin-bottom:8px;">`
        : '<div style="font-size:50px;">⚡</div>';

    return `
    <html>
    <head>
        <title>${bill.billNo}</title>
        <style>
            ${getUrduFontCSS()}
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; max-width: 700px; margin: auto; color: #222; }
            .premium-header {
                background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
                color: #fff;
                padding: 20px;
                border-radius: 12px 12px 0 0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .premium-header .biz-info { text-align: left; }
            .premium-header h1 { margin: 0 0 5px 0; font-size: 24px; }
            .premium-header p { margin: 2px 0; font-size: 12px; opacity: 0.9; }
            .premium-header .logo { text-align: right; }
            .bill-type-badge {
                background: var(--warning, #f39c12);
                color: #fff;
                padding: 5px 20px;
                border-radius: 0 0 12px 12px;
                display: inline-block;
                font-weight: bold;
                font-size: 14px;
                letter-spacing: 2px;
            }
            .meta-grid {
                display: grid;
                grid-template-columns: 1fr 1fr 1fr;
                gap: 10px;
                background: #f8f9fa;
                padding: 12px;
                border-radius: 8px;
                margin: 12px 0;
                font-size: 12px;
            }
            .meta-grid div { line-height: 1.6; }
            .meta-grid b { color: #2c3e50; }
            .cust-section {
                display: flex;
                gap: 15px;
                background: #eef2f7;
                padding: 12px;
                border-radius: 8px;
                margin-bottom: 12px;
                font-size: 13px;
            }
            .cust-section div { flex: 1; line-height: 1.6; }
            .items-table {
                width: 100%;
                border-collapse: collapse;
                margin: 12px 0;
                font-size: 12px;
            }
            .items-table th, .items-table td {
                border: 1px solid #444;
                padding: 6px 8px;
                text-align: left;
            }
            .items-table th { background: #2c3e50; color: #fff; text-align: center; font-size: 11px; }
            .items-table td.num { text-align: right; }
            .items-table td.center { text-align: center; }
            .pack-detail { font-size: 10px; color: #666; font-style: italic; }
            .totals-premium {
                background: #f8f9fa;
                border-radius: 10px;
                padding: 12px 18px;
                max-width: 380px;
                margin-left: auto;
                margin-top: 15px;
            }
            .totals-premium div {
                display: flex;
                justify-content: space-between;
                padding: 5px 0;
                font-size: 13px;
            }
            .totals-premium .grand {
                border-top: 2px solid #2c3e50;
                font-weight: bold;
                font-size: 16px;
                color: #2c3e50;
            }
            .totals-premium .bal { color: #c0392b; font-weight: bold; }
            .urdu-note {
                font-family: 'Noto Nastaliq Urdu', serif;
                font-size: 12px;
                text-align: center;
                margin-top: 20px;
                line-height: 2.2;
                color: #555;
                border-top: 1px solid #ccc;
                padding-top: 10px;
            }
            .sig-premium {
                margin-top: 35px;
                display: flex;
                justify-content: space-between;
                font-size: 13px;
                font-weight: bold;
            }
            .sig-premium .box {
                border-top: 2px solid #2c3e50;
                width: 150px;
                text-align: center;
                padding-top: 5px;
            }
        </style>
    </head>
    <body>
        <div class="premium-header">
            <div class="biz-info">
                <h1>${agency.name}</h1>
                ${agency.address ? `<p>📍 ${agency.address}</p>` : ''}
                ${agency.mobile ? `<p>📱 ${agency.mobile}</p>` : ''}
                ${agency.ntn ? `<p>🔢 NTN: ${agency.ntn}</p>` : ''}
            </div>
            <div class="logo">${logoHtml}</div>
        </div>
        <div style="text-align:center;"><span class="bill-type-badge">CASH / CREDIT</span></div>

        <div class="meta-grid">
            <div><b>🧾 Bill No:</b> ${bill.billNo}</div>
            <div><b>📅 Date:</b> ${dateStr}</div>
            <div><b>🕐 Time:</b> ${timeStr}</div>
            ${bill.salesMan ? `<div><b>👤 Sales Man:</b> ${bill.salesMan}</div>` : ''}
            ${bill.route ? `<div><b>🛣️ Route:</b> ${bill.route}</div>` : ''}
            <div><b>📦 Items:</b> ${(bill.items || []).length}</div>
        </div>

        <div class="cust-section">
            <div>
                <b>👤 Customer:</b> ${customer.name}<br>
                ${customer.address ? `📍 ${customer.address}` : ''}
            </div>
            <div>
                ${customer.mobile ? `<b>📱</b> ${customer.mobile}` : ''}
            </div>
        </div>

        <table class="items-table">
            <tr>
                <th>Item</th>
                <th>Pack</th>
                <th>Ctn-Box-Units</th>
                <th>Bonus</th>
                <th>Rate</th>
                <th>Disc%</th>
                <th>Extended</th>
            </tr>
            ${items.map(it => `
            <tr>
                <td>${it.name}</td>
                <td class="center">${it.packSize || '—'}</td>
                <td class="center">1 - 0 - ${it.qty}</td>
                <td class="center">${it.bonus || 0}</td>
                <td class="num">Rs ${it.rate}</td>
                <td class="center">0.00%</td>
                <td class="num">Rs ${it.total}</td>
            </tr>`).join('')}
            <tr>
                <td colspan="6" style="text-align:right; font-weight:bold;">Totals:</td>
                <td class="num" style="font-weight:bold;">Rs ${tot.subTotal}</td>
            </tr>
        </table>

        <div class="totals-premium">
            <div><span>Sub Total:</span><span>Rs ${tot.subTotal}</span></div>
            <div><span>Discount:</span><span>- Rs ${tot.discount}</span></div>
            <div class="grand"><span>Grand Total:</span><span>Rs ${tot.grandTotal}</span></div>
            <div><span>Previous Balance:</span><span>Rs ${tot.prevBalance}</span></div>
            <div><span>Received:</span><span>- Rs ${tot.received}</span></div>
            <div class="bal"><span>TOTAL BALANCE:</span><span>Rs ${tot.balance}</span></div>
        </div>

        <div class="urdu-note">
            سیل میں کی گئی ترین کا ادارہ ذمہ دار نہیں ہوگا۔ براہ کرم بل کی رقم مقررہ تاریخ تک ادا کر دیں۔ شکریہ!
        </div>

        <div class="sig-premium">
            <div class="box">Prepared By</div>
            <div class="box">Authorized Signature</div>
        </div>
    </body>
    </html>
    `;
}

// ============================================
// 🎨 TEMPLATE 6: 🧾 ULTRA-ADAPTIVE SMART THERMAL POS SLIP (80mm & 58mm)
// Bilingual Engine (English LTR & Urdu RTL):
// - English (LTR): Clean Left-to-Right layout, monospace font, standard English POS labels
// - Urdu (RTL): Authentic Right-to-Left layout, Nastaliq typography, pure Urdu labels
// - Auto width adaptation: 80mm (Default) & 58mm (Portable / Handheld Bluetooth)
// - Anti-truncation 2-line item architecture
// ============================================
function template6Thermal(bill, agency, customer, settings) {
    const s = settings || (window.ebPrintEngine ? window.ebPrintEngine.getEffectivePrintSettings(agency) : {});
    const items = getTemplateItems(bill);
    const tot = getTemplateTotals(bill);
    const dateStr = bill.date || new Date().toISOString().split('T')[0];
    const timeStr = bill.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 🌐 Language & Direction Detection (English LTR vs Urdu RTL)
    const rawLang = (s && s.billLanguage) ||
                    (bill && bill.language) ||
                    (agency && agency.billLanguage) ||
                    (typeof localStorage !== 'undefined' ? (localStorage.getItem('eb_bill_language') || localStorage.getItem('eb_app_language')) : null) ||
                    'en';
    const isUrdu = String(rawLang).toLowerCase() === 'ur';

    // Direction & Typography
    const dir = isUrdu ? 'rtl' : 'ltr';
    const textAlign = isUrdu ? 'right' : 'left';
    const fontFamily = isUrdu
        ? "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', 'Urdu Typesetting', 'Segoe UI', Tahoma, sans-serif"
        : "'Courier New', Courier, 'Lucida Console', Monaco, monospace, sans-serif";

    // 🖨️ Determine Thermal Paper Width (Priority: settings > bill > agency > localStorage > default '80')
    const rawWidth = (s && s.thermalWidth) ||
                     (bill && bill.thermalWidth) ||
                     (agency && agency.thermalPaperWidth) ||
                     (typeof localStorage !== 'undefined' ? localStorage.getItem('eb_thermal_width') : null) ||
                     '80';
    const is58 = String(rawWidth).trim() === '58';

    // Dynamic Sizing Tokens based on paper width
    const pageWidth = is58 ? '58mm' : '80mm';
    const printableWidth = is58 ? '48mm' : '72mm';
    const baseFontSize = isUrdu ? (is58 ? '11.5px' : '13px') : (is58 ? '11px' : '12px');
    const titleSize = isUrdu ? (is58 ? '16px' : '19px') : (is58 ? '15px' : '18px');
    const grandSize = isUrdu ? (is58 ? '15px' : '17px') : (is58 ? '14px' : '16px');
    const logoMaxHeight = is58 ? '42px' : '56px';
    const logoMaxWidth = is58 ? '110px' : '150px';
    const lineSpacing = isUrdu ? '1.5' : (is58 ? '1.25' : '1.35');

    // Language Dictionary (English vs Urdu)
    const rawPayType = String(bill.payType || (agency && agency.payType) || 'CASH').toUpperCase();
    let payTypeBadge = '*** CASH SALE ***';
    if (isUrdu) {
        if (rawPayType.includes('CREDIT') || rawPayType.includes('UDHAAR')) payTypeBadge = '*** ادھار کھاتہ بل ***';
        else if (rawPayType.includes('BANK') || rawPayType.includes('ONLINE')) payTypeBadge = '*** آن لائن / بینک ادائیگی ***';
        else if (rawPayType.includes('CHEQUE')) payTypeBadge = '*** چیک ادائیگی ***';
        else payTypeBadge = '*** نقد فروخت ***';
    } else {
        if (rawPayType.includes('CREDIT') || rawPayType.includes('UDHAAR')) payTypeBadge = '*** CREDIT / UDHAAR ***';
        else if (rawPayType.includes('BANK') || rawPayType.includes('ONLINE')) payTypeBadge = '*** BANK / ONLINE ***';
        else if (rawPayType.includes('CHEQUE')) payTypeBadge = '*** CHEQUE ***';
        else payTypeBadge = '*** CASH SALE ***';
    }

    const L = {
        title: isUrdu ? (agency.name || 'آسان بل اسٹور') : (agency.name || 'EasyBill Store'),
        prop: isUrdu ? 'پروپرائٹر:' : 'Prop:',
        phone: isUrdu ? 'فون:' : 'Phone:',
        ntn: isUrdu ? 'این ٹی این:' : 'NTN / STRN:',
        invoiceNo: isUrdu ? 'بل نمبر:' : 'Invoice / Bill #:',
        dateTime: isUrdu ? 'تاریخ و وقت:' : 'Date & Time:',
        customer: isUrdu ? 'گاہک / خریدار:' : 'Customer:',
        walkInCustomer: isUrdu ? 'کاؤنٹر گاہک (نقد)' : 'Cash Customer',
        customerPhone: isUrdu ? 'گاہک فون:' : 'Customer Phone:',
        routeArea: isUrdu ? 'علاقہ / روٹ:' : 'Route / Area:',
        booker: isUrdu ? 'سیلز مین / آرڈر بکر:' : 'Booker / Sales:',
        itemsHeaderName: isUrdu ? 'نام و تفصیل آئٹم' : 'Item Description',
        itemsHeaderCalc: isUrdu ? 'تعداد × ریٹ &nbsp; کل رقم' : 'Qty × Rate &nbsp; Total',
        currPrefix: isUrdu ? '' : 'Rs ',
        currSuffix: isUrdu ? ' روپے' : '',
        subTotal: isUrdu ? 'خام رقم:' : 'Sub Total:',
        discount: isUrdu ? 'رعایت (ڈسکاؤنٹ):' : 'Discount:',
        tax: isUrdu ? 'ٹیکس / جی ایس ٹی:' : 'Tax / GST:',
        grandTotal: isUrdu ? 'کل میزان (ٹوٹل):' : 'NET TOTAL:',
        prevBalance: isUrdu ? 'پچھلا بقایا (کھاتہ):' : 'Prev Balance:',
        totalDue: isUrdu ? 'کل واجب الادا:' : 'Total Due:',
        received: isUrdu ? 'وصول شدہ رقم:' : 'Received / Paid:',
        remainingBalance: isUrdu ? 'موجودہ بقایا کھاتہ:' : 'Remaining Balance:',
        changeReturn: isUrdu ? 'واپسی رقم:' : 'Change Return:',
        paidStatus: isUrdu ? 'مکمل ادا شدہ' : 'PAID (CLEAR)',
        totalItemsCount: isUrdu ? 'کل آئٹمز:' : 'Total Items:',
        totalQuantityCount: isUrdu ? 'کل تعداد:' : 'Total Qty:',
        termsDefault: isUrdu
            ? 'مال واپس یا تبدیل 3 دن کے اندر بل کے ساتھ ممکن ہے۔'
            : 'Return / Exchange within 3 days with original receipt.',
        thankYou: isUrdu ? 'شکریہ! دوبارہ تشریف لائیں۔' : 'Thank you for your business!',
        thankYouSub: isUrdu ? 'آپ کے تعاون کا بہت شکریہ۔' : 'Please visit us again soon.',
        signature: isUrdu ? 'دستخط مجاز' : 'Authorized Signature',
        softwareFooter: isUrdu ? 'این ایچ پی او ایس سسٹم' : 'Printed via NH POS System'
    };

    // Formatted Values Helper
    const fmt = (v) => `${L.currPrefix}${parseFloat(v || 0).toLocaleString()}${L.currSuffix}`;
    const subTotalFormatted = fmt(tot.subTotal);
    const discountVal = parseFloat(tot.discount || 0);
    const discountFormatted = discountVal > 0 ? fmt(discountVal) : null;
    const taxVal = parseFloat(tot.tax || 0);
    const taxFormatted = taxVal > 0 ? fmt(taxVal) : null;
    const grandTotalFormatted = fmt(tot.grandTotal);
    const prevBalVal = parseFloat(tot.prevBalance || 0);
    const prevBalFormatted = prevBalVal > 0 ? fmt(prevBalVal) : null;
    const totalDueFormatted = fmt(parseFloat(tot.grandTotal || 0) + prevBalVal);
    const receivedVal = parseFloat(tot.received || 0);
    const receivedFormatted = receivedVal > 0 ? fmt(receivedVal) : null;
    const balanceVal = parseFloat(tot.balance || 0);

    return `
    <!DOCTYPE html>
    <html dir="${dir}">
    <head>
        <meta charset="UTF-8">
        <title>${isUrdu ? 'بل نمبر' : 'Receipt'} #${bill.billNo || '0000'}</title>
        <style>
            @media print {
                @page {
                    margin: 0;
                    size: ${pageWidth} auto;
                }
                html, body {
                    margin: 0 !important;
                    padding: 0 !important;
                    width: ${pageWidth} !important;
                    background: #fff !important;
                }
                .no-print { display: none !important; }
            }
            * {
                box-sizing: border-box;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            body {
                direction: ${dir};
                text-align: ${textAlign};
                font-family: ${fontFamily};
                width: ${printableWidth};
                max-width: ${printableWidth};
                margin: 0 auto;
                padding: ${is58 ? '4px 2px 10px 2px' : '6px 4px 14px 4px'};
                color: #000;
                background: #fff;
                font-size: ${baseFontSize};
                line-height: ${lineSpacing};
                text-rendering: optimizeLegibility;
            }
            .t-center { text-align: center; }
            .t-bold { font-weight: bold; }
            
            /* Dividers */
            .t-divider {
                border-top: 1px dashed #000;
                margin: 5px 0;
            }
            .t-divider-double {
                border-top: 3px double #000;
                margin: 5px 0;
            }

            /* Header Section */
            .t-header {
                text-align: center;
                padding-bottom: 4px;
            }
            .t-logo-wrap {
                margin-bottom: 4px;
            }
            .t-logo {
                max-height: ${logoMaxHeight};
                max-width: ${logoMaxWidth};
                object-fit: contain;
                filter: grayscale(100%) contrast(140%);
                display: inline-block;
            }
            .t-store-name {
                font-size: ${titleSize};
                font-weight: 900;
                line-height: 1.25;
                margin: 2px 0;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .t-subtext {
                font-size: ${is58 ? '10px' : '11px'};
                margin: 1.5px 0;
                line-height: 1.3;
            }
            .t-pay-badge {
                display: inline-block;
                font-weight: 900;
                font-size: ${is58 ? '11px' : '12px'};
                padding: 1px 6px;
                border: 1px solid #000;
                margin-top: 3px;
                text-transform: uppercase;
            }

            /* Meta Information Table */
            .t-meta-table {
                width: 100%;
                font-size: ${is58 ? '10.5px' : '11px'};
                line-height: 1.35;
                margin: 3px 0;
            }
            .t-row {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin: 1.5px 0;
            }
            .t-row > span:first-child {
                color: #222;
            }

            /* Items Section - Ultra-clean 2-line layout */
            .t-items-header {
                display: flex;
                justify-content: space-between;
                font-weight: bold;
                font-size: ${is58 ? '10.5px' : '11px'};
                border-top: 1px dashed #000;
                border-bottom: 1px dashed #000;
                padding: 3px 0;
                margin: 4px 0 3px 0;
                text-transform: uppercase;
            }
            .t-item-block {
                padding: 3.5px 0;
                border-bottom: 1px dotted #bbb;
            }
            .t-item-block:last-child {
                border-bottom: none;
            }
            .t-item-top {
                font-weight: 800;
                font-size: ${is58 ? '11px' : '12px'};
                word-break: break-word;
                line-height: 1.3;
                color: #000;
            }
            .t-item-bottom {
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: ${is58 ? '10.5px' : '11.5px'};
                margin-top: 1.5px;
            }
            .t-item-calc {
                color: #333;
            }
            .t-item-amount {
                font-weight: 800;
                color: #000;
            }

            /* Totals Section */
            .t-totals-wrap {
                margin-top: 4px;
                padding: 3px 0;
            }
            .t-totals-row {
                display: flex;
                justify-content: space-between;
                font-size: ${is58 ? '11px' : '12px'};
                margin: 2px 0;
            }
            .t-grand-box {
                border-top: 1.5px solid #000;
                border-bottom: 1.5px solid #000;
                padding: 4px 0;
                margin: 4px 0;
                font-size: ${grandSize};
                font-weight: 900;
                display: flex;
                justify-content: space-between;
                letter-spacing: 0.5px;
            }
            .t-bal-row {
                font-size: ${is58 ? '12px' : '13px'};
                font-weight: 800;
                padding-top: 2px;
            }

            /* Footer Section */
            .t-footer {
                margin-top: 8px;
                text-align: center;
                font-size: ${is58 ? '10px' : '11px'};
                line-height: 1.4;
            }
            .t-terms {
                font-size: ${is58 ? '9.5px' : '10px'};
                margin: 5px 0;
                padding: 3px;
                border: 1px dashed #888;
                border-radius: 3px;
            }
            .t-barcode-text {
                letter-spacing: 3px;
                font-weight: bold;
                margin-top: 6px;
                font-size: ${is58 ? '11px' : '13px'};
                font-family: monospace;
            }
        </style>
    </head>
    <body>
        <!-- STORE HEADER -->
        <div class="t-header">
            ${(s.showLogo !== false) && agency.logo ? `
                <div class="t-logo-wrap">
                    <img src="${agency.logo}" alt="Store Logo" class="t-logo" />
                </div>
            ` : ''}

            ${(s.showAgencyName !== false) ? `
                <div class="t-store-name">${L.title}</div>
            ` : ''}

            ${(s.showOwnerName !== false) && agency.ownerName ? `
                <div class="t-subtext">${L.prop} ${agency.ownerName}</div>
            ` : ''}

            ${(s.showAddress !== false) && agency.address ? `
                <div class="t-subtext">${agency.address}${agency.city ? ', ' + agency.city : ''}</div>
            ` : ''}

            ${(s.showMobiles !== false) && agency.mobile ? `
                <div class="t-subtext">${L.phone} ${agency.mobile}</div>
            ` : ''}

            ${(s.showNTN !== false) && agency.ntn ? `
                <div class="t-subtext">${L.ntn} ${agency.ntn}</div>
            ` : ''}

            ${(s.showPayType !== false) ? `
                <div class="t-pay-badge">${payTypeBadge}</div>
            ` : ''}
        </div>

        <div class="t-divider"></div>

        <!-- BILL METADATA -->
        <div class="t-meta-table">
            ${(s.showBillNo !== false) ? `
                <div class="t-row">
                    <span>${L.invoiceNo}</span>
                    <span class="t-bold">${bill.billNo || '0000'}</span>
                </div>
            ` : ''}

            ${(s.showDate !== false) ? `
                <div class="t-row">
                    <span>${L.dateTime}</span>
                    <span>${dateStr}${(s.showTime !== false) ? ' ' + timeStr : ''}</span>
                </div>
            ` : ''}

            ${(s.showCustomerName !== false) ? `
                <div class="t-row">
                    <span>${L.customer}</span>
                    <span class="t-bold">${customer.name || L.walkInCustomer}</span>
                </div>
            ` : ''}

            ${(s.showCustomerPhone !== false) && customer.mobile ? `
                <div class="t-row">
                    <span>${L.customerPhone}</span>
                    <span>${customer.mobile}</span>
                </div>
            ` : ''}

            ${(s.showCustomerRoute !== false) && (customer.route || customer.area) ? `
                <div class="t-row">
                    <span>${L.routeArea}</span>
                    <span>${customer.route || customer.area}</span>
                </div>
            ` : ''}

            ${(s.showBookerName !== false) && (bill.bookerName || bill.salesmanName) ? `
                <div class="t-row">
                    <span>${L.booker}</span>
                    <span>${bill.bookerName || bill.salesmanName}</span>
                </div>
            ` : ''}
        </div>

        <!-- ITEMS HEADER -->
        <div class="t-items-header">
            <span>${L.itemsHeaderName}</span>
            <span>${L.itemsHeaderCalc}</span>
        </div>

        <!-- ITEMS LIST (Smart 2-Line Architecture: Anti-truncation & 100% Readable) -->
        <div class="t-items-list">
            ${items.map(it => `
                <div class="t-item-block">
                    <div class="t-item-top">
                        ${(s.showItemSno !== false) ? `<span>${it.sno}.</span> ` : ''}${it.name}${it.unit ? ` <span style="font-weight:normal; font-size:0.9em;">(${it.unit})</span>` : ''}
                    </div>
                    <div class="t-item-bottom">
                        <span class="t-item-calc">
                            ${it.qty} × ${fmt(it.rate)}${it.discount && parseFloat(it.discount) > 0 ? ` <small>(-${it.discount})</small>` : ''}
                        </span>
                        <span class="t-item-amount">${fmt(it.total)}</span>
                    </div>
                </div>
            `).join('')}
        </div>

        <div class="t-divider"></div>

        <!-- TOTALS & KHATA SECTION -->
        <div class="t-totals-wrap">
            ${(s.showSubTotal !== false) ? `
                <div class="t-totals-row">
                    <span>${L.subTotal}</span>
                    <span>${subTotalFormatted}</span>
                </div>
            ` : ''}

            ${(s.showDiscount !== false && discountFormatted) ? `
                <div class="t-totals-row">
                    <span>${L.discount}</span>
                    <span>- ${discountFormatted}</span>
                </div>
            ` : ''}

            ${(s.showTax !== false && taxFormatted) ? `
                <div class="t-totals-row">
                    <span>${L.tax}</span>
                    <span>+ ${taxFormatted}</span>
                </div>
            ` : ''}

            ${(s.showGrandTotal !== false) ? `
                <div class="t-grand-box">
                    <span>${L.grandTotal}</span>
                    <span>${grandTotalFormatted}</span>
                </div>
            ` : ''}

            ${(s.showPreviousBalance !== false && prevBalFormatted) ? `
                <div class="t-totals-row">
                    <span>${L.prevBalance}</span>
                    <span>${prevBalFormatted}</span>
                </div>
                <div class="t-totals-row t-bold" style="border-top:1px dotted #000; padding-top:2px;">
                    <span>${L.totalDue}</span>
                    <span>${totalDueFormatted}</span>
                </div>
            ` : ''}

            ${(s.showReceivedAmount !== false && receivedFormatted) ? `
                <div class="t-totals-row">
                    <span>${L.received}</span>
                    <span>- ${receivedFormatted}</span>
                </div>
            ` : ''}

            ${(s.showBalance !== false) ? `
                <div class="t-totals-row t-bal-row" style="border-top:1px dashed #000; margin-top:3px;">
                    <span>${balanceVal > 0 ? L.remainingBalance : (balanceVal < 0 ? L.changeReturn : (isUrdu ? 'حیثیت بل:' : 'Status:'))}</span>
                    <span>${balanceVal === 0 ? L.paidStatus : fmt(Math.abs(balanceVal))}</span>
                </div>
            ` : ''}
        </div>

        <div class="t-divider-double"></div>

        <!-- TOTAL ITEMS COUNT -->
        <div class="t-row t-bold" style="font-size:${is58 ? '10px' : '11px'}; margin-bottom:4px;">
            <span>${L.totalItemsCount} ${items.length}</span>
            <span>${L.totalQuantityCount} ${items.reduce((acc, it) => acc + (parseFloat(it.qty) || 0), 0)}</span>
        </div>

        <!-- FOOTER & POLICIES -->
        <div class="t-footer">
            ${(s.showTermsAndConditions !== false && agency.invoiceFooter) ? `
                <div class="t-terms">${agency.invoiceFooter}</div>
            ` : `
                <div class="t-terms">${L.termsDefault}</div>
            `}

            ${(s.showThankYouNote !== false) ? `
                <div class="t-bold" style="margin-top:5px;">${L.thankYou}</div>
                <div style="font-size:${is58 ? '9.5px' : '10.5px'};">${L.thankYouSub}</div>
            ` : ''}

            ${(s.showSignatureAuthorized !== false) ? `
                <div style="margin-top:16px; border-top:1px dashed #000; padding-top:3px; display:inline-block; min-width:120px;">
                    ${L.signature}
                </div>
            ` : ''}

            <div class="t-barcode-text">*${bill.billNo || '0000'}*</div>
            <div style="font-size:8.5px; color:#444; margin-top:4px;">${L.softwareFooter}</div>
        </div>
    </body>
    </html>
    `;
}

// ============================================
// 🎨 TEMPLATE 7: 📦 FMCG CORPORATE CASH MEMO / INVOICE
// Recreated with 100% fidelity from AL RAHEEM AGENCIES Cash Memo/Invoice (Samples 1 & 2)
// Features: Centered "Cash Memo/Invoice" Title, Exact 2-Column Meta Table (Distributor vs Invoice info),
// 10-Column Items Table (Item/Product Name, SKU Code, CTN, Box, Free Units, T.P. Per Box, Gross Amount, Total Discount, Net Amount, N.P Per Box),
// Lower Split: "Promotions Applied" breakdown box + Load Form #, Financial Calculation box (Gross, Total Discount, Net Invoice Amount, Special TO),
// 3 Signature boxes (Checked By Order Booker, Delivered By, Shop Keeper), and Authentic Urdu Handwritten Note Stamp.
// ============================================
function template7FMCGDistribution(bill, agency, customer, settings) {
    const s = settings || (window.ebPrintEngine ? window.ebPrintEngine.getEffectivePrintSettings(agency) : {});
    const tot = getTemplateTotals(bill);

    // Helper for 2-digit year short date e.g. 28/09/26
    function formatFmcgShortDate(d) {
        if (!d) return '28/09/26';
        if (typeof d === 'string' && /^\d{2}\/\d{2}\/\d{2,4}$/.test(d.trim())) return d.trim();
        const dt = new Date(d);
        if (isNaN(dt.getTime())) return String(d);
        const dd = String(dt.getDate()).padStart(2, '0');
        const mm = String(dt.getMonth() + 1).padStart(2, '0');
        const yy = String(dt.getFullYear()).slice(-2);
        return `${dd}/${mm}/${yy}`;
    }

    const dateStr = formatFmcgShortDate(bill.date || bill.createdAt || bill.invoiceDate);
    const deliveryDateStr = formatFmcgShortDate(bill.deliveryDate || bill.dispatchDate || bill.date);
    const billNo = bill.billNo || 'D1772INV1452';
    const pjpName = bill.pjpName || (bill.bookerName ? `${bill.bookerName} Monday` : (agency.ownerName ? `${agency.ownerName} Monday` : 'M Wakeel Monday'));
    const channelName = bill.channel || (customer.customerType === 'retail' ? 'Retail' : (customer.customerType === 'wholesale' ? 'Wholesale' : 'Retail'));
    const loadFormNo = bill.loadFormNo ? ('Load Form # ' + bill.loadFormNo.replace(/^Load Form #\s*/i, '')) : ('Load Form # D' + (bill.billNo ? String(bill.billNo).replace(/\D/g, '') : '1772') + 'LF' + (bill.billNo ? String(bill.billNo).slice(-3) : '145'));
    
    const distName = agency.name || 'AL RAHEEM AGENCIES - COOKANIA FULL RANGE - SADIQABAD';
    const distAddress = agency.address || 'NEW CLOTH MARKET SADIQABAD';
    const distContact = agency.mobile || '03012633833';

    const custCode = bill.storeCode || customer.code || (customer.id ? ('N' + String(customer.id).slice(-11).padStart(11, '0')) : 'N00000544633');
    const custStoreName = customer.shopName ? customer.shopName : (customer.name || 'Taj Ker Near By Pass');
    const custStoreAddress = customer.address || customer.area || customer.route || 'Taj Chowk';
    const custStoreContact = customer.mobile || customer.phone || '03077220786';

    const checkedByBooker = bill.bookerName || bill.salesmanName || 'M Wakeel';
    const deliveredBy = bill.deliveredBy || bill.deliveryMan || bill.supplierName || 'Hamza';

    // Build 10-column item rows & calculate totals
    let totalCtn = 0;
    let totalBox = 0;
    let totalFreeUnits = 0;
    let totalGross = 0;
    let totalDiscount = 0;
    let totalNet = 0;

    const items = bill.items || [];
    const itemRows = items.map((it, idx) => {
        const sku = it.skuCode || it.sku || it.barcode || it.code || ('SKU' + String(idx + 1).padStart(5, '0'));
        const ctnVal = (it.ctn !== undefined && it.ctn !== null && it.ctn !== '') ? it.ctn : (it.carton !== undefined ? it.carton : '-');
        if (typeof ctnVal === 'number' && !isNaN(ctnVal)) totalCtn += ctnVal;

        const boxVal = parseFloat(it.box !== undefined && it.box !== null && it.box !== '' ? it.box : (it.boxes !== undefined ? it.boxes : it.qty)) || 1;
        totalBox += boxVal;

        const freeVal = (it.freeUnits !== undefined && it.freeUnits !== null && it.freeUnits !== '') ? it.freeUnits : (it.freeQty !== undefined ? it.freeQty : (it.bonus || '-'));
        if (typeof freeVal === 'number' && !isNaN(freeVal)) totalFreeUnits += freeVal;

        const tp = parseFloat(it.tp !== undefined ? it.tp : (it.tradePrice !== undefined ? it.tradePrice : it.rate)) || 0;
        const gross = parseFloat(it.gross !== undefined ? it.gross : (boxVal * tp));
        totalGross += gross;

        // Discount computation
        let disc = 0;
        if (it.totalDiscount !== undefined) {
            disc = parseFloat(it.totalDiscount) || 0;
        } else if (it.discount !== undefined) {
            disc = parseFloat(it.discount) || 0;
        } else if (it.disc !== undefined) {
            disc = parseFloat(it.disc) || 0;
        } else if (bill.discount && items.length > 0) {
            disc = (parseFloat(bill.discount) / items.length);
        }
        totalDiscount += disc;

        const net = Math.max(0, gross - disc);
        totalNet += net;

        const npPerBox = it.npPerBox !== undefined ? parseFloat(it.npPerBox) : (boxVal > 0 ? (net / boxVal) : net);

        return `
        <tr>
            <td class="col-name">${it.name}</td>
            <td class="col-center col-sku">${sku}</td>
            <td class="col-center">${ctnVal}</td>
            <td class="col-center col-bold">${boxVal}</td>
            <td class="col-center">${freeVal}</td>
            <td class="col-right">${tp.toFixed(2)}</td>
            <td class="col-right">${gross.toFixed(2)}</td>
            <td class="col-right">${disc > 0 ? disc.toFixed(2) : '0.00'}</td>
            <td class="col-right col-bold">${net.toFixed(2)}</td>
            <td class="col-right">${npPerBox.toFixed(2)}</td>
        </tr>`;
    }).join('');

    // Promotions Applied breakdown rows
    let promoRows = '';

    if (Array.isArray(bill.promotions) && bill.promotions.length > 0) {
        promoRows = bill.promotions.map((p, pIdx) => {
            const letter = String.fromCharCode(97 + (pIdx % 26));
            return `
            <tr>
                <td class="promo-cell-summary">(${letter}) ${p.summary || p.name || 'Promotion'}</td>
                <td class="promo-cell-amount">${parseFloat(p.amount || 0).toFixed(2)}</td>
            </tr>`;
        }).join('');
    } else {
        // Automatically build item promotions from items and bill discount
        const promoItems = [];
        items.forEach((it) => {
            const discVal = parseFloat(it.disc !== undefined ? it.disc : (it.discount || it.totalDiscount || 0));
            const boxVal = parseFloat(it.box !== undefined && it.box !== null && it.box !== '' ? it.box : (it.boxes !== undefined ? it.boxes : (it.qty || 1))) || 1;
            if (discVal > 0 || it.promoDesc) {
                const perBox = boxVal > 0 ? (discVal / boxVal).toFixed(2) : discVal.toFixed(2);
                const summaryTxt = it.promoDesc || `${it.name} (${perBox}/Box)`;
                promoItems.push({
                    text: summaryTxt,
                    amount: discVal
                });
            }
        });

        // Add bill-level pass-on discount if total bill discount exceeds item-level discounts
        const itemDiscSum = promoItems.reduce((acc, p) => acc + p.amount, 0);
        const billDisc = parseFloat(bill.discount || 0);
        if (billDisc > itemDiscSum + 0.01) {
            const passOn = billDisc - itemDiscSum;
            promoItems.push({
                text: `${agency.name ? agency.name.split(' ')[0] : 'Retail'} Pass on Retail - 3%`,
                amount: passOn
            });
        }

        if (promoItems.length === 0 && totalDiscount > 0) {
            promoItems.push({
                text: 'Retail Pass on Discount Scheme',
                amount: totalDiscount
            });
        }

        if (promoItems.length === 0) {
            promoItems.push({
                text: 'Standard Trade Offer Scheme (Nil)',
                amount: 0.00
            });
        }

        promoRows = promoItems.map((p, pIdx) => {
            const letter = String.fromCharCode(97 + (pIdx % 26));
            return `
            <tr>
                <td class="promo-cell-summary">(${letter}) ${p.text}</td>
                <td class="promo-cell-amount">${parseFloat(p.amount).toFixed(2)}</td>
            </tr>`;
        }).join('');
    }

    const roundedNetInvoice = Math.round(totalNet);
    const specialTO = parseFloat(bill.specialTO !== undefined ? bill.specialTO : 0).toFixed(2);

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="utf-8">
        <title>Cash Memo/Invoice - ${billNo}</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap');
            
            @media print {
                @page {
                    size: A4 portrait;
                    margin: 6mm 8mm;
                }
                body {
                    margin: 0;
                    padding: 0;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                .no-print { display: none !important; }
            }

            * {
                box-sizing: border-box;
            }

            body {
                font-family: Arial, Helvetica, sans-serif;
                color: #000;
                background: #fff;
                margin: 0 auto;
                padding: 10px 14px;
                max-width: 820px;
                font-size: 11px;
                line-height: 1.25;
            }

            /* 📄 TITLE */
            .memo-title {
                text-align: center;
                font-size: 19px;
                font-weight: bold;
                letter-spacing: 0.3px;
                margin: 0 0 8px 0;
                color: #000;
            }

            /* 🏢 2-COLUMN HEADER META BOX */
            .meta-box-table {
                width: 100%;
                border-collapse: collapse;
                border: 1px solid #000;
                margin-bottom: 8px;
            }
            .meta-box-table td {
                vertical-align: top;
                padding: 2.5px 6px;
                font-size: 10.5px;
            }
            .meta-lbl {
                font-weight: bold;
                color: #000;
                white-space: nowrap;
                width: 22%;
            }
            .meta-val {
                color: #000;
                font-weight: 500;
            }

            /* 📦 10-COLUMN PRODUCT TABLE */
            .items-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 8px;
            }
            .items-table th {
                border: 1px solid #000;
                background: #f2f2f2;
                font-size: 9.5px;
                font-weight: bold;
                padding: 4px 3px;
                text-align: center;
                color: #000;
            }
            .items-table td {
                border: 1px solid #000;
                padding: 3.5px 4px;
                font-size: 9.5px;
                color: #000;
            }
            .col-name {
                text-align: left;
                font-weight: bold;
                max-width: 190px;
                word-wrap: break-word;
            }
            .col-center {
                text-align: center;
            }
            .col-right {
                text-align: right;
                font-family: Arial, sans-serif;
            }
            .col-bold {
                font-weight: bold;
            }
            .col-sku {
                font-size: 9px;
            }

            /* TOTAL ROW */
            .total-row td {
                font-weight: bold;
                border-top: 1.5px solid #000;
                border-bottom: 1.5px solid #000;
                background: #fafafa;
                padding: 4px 3px;
            }

            /* 📊 LOWER SECTION (PROMOTIONS + FINANCIAL SUMMARY) */
            .bottom-split {
                width: 100%;
                border-collapse: collapse;
                margin-top: 4px;
                margin-bottom: 8px;
            }
            .bottom-split td {
                vertical-align: top;
            }

            /* PROMOTIONS APPLIED BOX (LEFT) */
            .promo-table {
                width: 100%;
                border-collapse: collapse;
                border: 1px solid #000;
            }
            .promo-header-main {
                border: 1px solid #000;
                text-align: center;
                font-weight: bold;
                font-size: 10.5px;
                padding: 3px 6px;
                background: #fff;
            }
            .promo-sub-l {
                border: 1px solid #000;
                text-align: left;
                font-weight: bold;
                font-size: 9.5px;
                padding: 3px 6px;
                background: #f2f2f2;
                width: 78%;
            }
            .promo-sub-r {
                border: 1px solid #000;
                text-align: right;
                font-weight: bold;
                font-size: 9.5px;
                padding: 3px 6px;
                background: #f2f2f2;
                width: 22%;
            }
            .promo-cell-summary {
                border: 1px solid #000;
                text-align: left;
                font-size: 9px;
                padding: 2.5px 6px;
                color: #111;
            }
            .promo-cell-amount {
                border: 1px solid #000;
                text-align: right;
                font-size: 9px;
                padding: 2.5px 6px;
                font-weight: bold;
            }
            .promo-tot-lbl {
                border: 1px solid #000;
                text-align: right;
                font-weight: bold;
                font-size: 9.5px;
                padding: 3px 6px;
                background: #fafafa;
            }
            .promo-tot-val {
                border: 1px solid #000;
                text-align: right;
                font-weight: bold;
                font-size: 9.5px;
                padding: 3px 6px;
                background: #fafafa;
            }
            .load-form-text {
                font-size: 10px;
                font-weight: bold;
                color: #000;
                margin-top: 5px;
            }

            /* FINANCIAL SUMMARY TABLE (RIGHT) */
            .calc-table {
                width: 100%;
                border-collapse: collapse;
                border: 1px solid #000;
            }
            .calc-table td {
                padding: 2.5px 8px;
                font-size: 10.5px;
                border: 1px solid #000;
            }
            .c-lbl {
                text-align: right;
                font-weight: bold;
                width: 60%;
            }
            .c-val {
                text-align: right;
                font-weight: bold;
                width: 40%;
                font-family: Arial, sans-serif;
            }
            .c-net-row td {
                background: #fafafa;
                font-weight: bold;
            }

            /* ✍️ THREE SIGNATURE BOXES */
            .sig-table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 14px;
            }
            .sig-table td {
                width: 33.33%;
                text-align: center;
                vertical-align: bottom;
                padding: 0 6px;
            }
            .sig-person-name {
                font-size: 11px;
                font-weight: bold;
                margin-bottom: 2px;
                min-height: 15px;
                color: #000;
            }
            .sig-box {
                border: 1px solid #000;
                height: 24px;
                line-height: 24px;
                font-size: 10px;
                font-weight: bold;
                text-align: center;
                background: #fff;
            }

            /* 🟣 AUTHENTIC URDU HANDWRITTEN STAMP */
            .urdu-stamp-container {
                margin-top: 14px;
                padding: 8px 14px;
                text-align: center;
                direction: rtl;
                font-family: 'Noto Nastaliq Urdu', serif;
                color: #3730a3;
                background: #faf5ff;
                border: 1.5px dashed #6366f1;
                border-radius: 8px;
                position: relative;
            }
            .urdu-stamp-title {
                font-size: 22px;
                font-weight: 700;
                line-height: 1.4;
                margin-bottom: 0px;
            }
            .urdu-stamp-body {
                font-size: 15px;
                font-weight: 700;
                line-height: 2;
                letter-spacing: 0.3px;
            }
            .urdu-stamp-sign {
                margin-top: 4px;
                font-size: 13px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0 10px;
            }
        </style>
    </head>
    <body>
        <!-- 📄 TITLE -->
        <div class="memo-title">Cash Memo/Invoice</div>

        <!-- 🏢 2-COLUMN HEADER META BOX (Exact Match: Al-Raheem Agencies) -->
        <table class="meta-box-table">
            <tr>
                <!-- Left: Distributor & Store Information -->
                <td style="width: 55%; border-right: 1px solid #000; padding: 0;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td class="meta-lbl">Distributor Name:</td>
                            <td class="meta-val"><b>${distName}</b></td>
                        </tr>
                        <tr>
                            <td class="meta-lbl">Distributor Address:</td>
                            <td class="meta-val">${distAddress}</td>
                        </tr>
                        <tr>
                            <td class="meta-lbl">Distributor Contact Number:</td>
                            <td class="meta-val">${distContact}</td>
                        </tr>
                        <tr>
                            <td class="meta-lbl">Store Code:</td>
                            <td class="meta-val">${custCode}</td>
                        </tr>
                        <tr>
                            <td class="meta-lbl">Store Name:</td>
                            <td class="meta-val"><b>${custStoreName}</b></td>
                        </tr>
                        <tr>
                            <td class="meta-lbl">Store Address:</td>
                            <td class="meta-val">${custStoreAddress}</td>
                        </tr>
                        <tr>
                            <td class="meta-lbl">Store Contact Number:</td>
                            <td class="meta-val">${custStoreContact}</td>
                        </tr>
                    </table>
                </td>

                <!-- Right: Invoice & Delivery Details -->
                <td style="width: 45%; padding: 0;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td class="meta-lbl" style="width: 32%;">Invoice No:</td>
                            <td class="meta-val" style="width: 68%;"><b>${billNo}</b></td>
                        </tr>
                        <tr>
                            <td class="meta-lbl">Invoice Date:</td>
                            <td class="meta-val">${dateStr}</td>
                        </tr>
                        <tr>
                            <td class="meta-lbl">Delivery Date:</td>
                            <td class="meta-val">${deliveryDateStr}</td>
                        </tr>
                        <tr>
                            <td class="meta-lbl">PJP Name:</td>
                            <td class="meta-val">${pjpName}</td>
                        </tr>
                        <tr>
                            <td class="meta-lbl">Channel:</td>
                            <td class="meta-val">${channelName}</td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>

        <!-- 📦 10-COLUMN PRODUCTS TABLE -->
        <table class="items-table">
            <thead>
                <tr>
                    <th style="width: 32%;">Item / Product Name</th>
                    <th style="width: 10%;">SKU Code</th>
                    <th style="width: 5%;">CTN</th>
                    <th style="width: 5%;">Box</th>
                    <th style="width: 7%;">Free Units</th>
                    <th style="width: 8%;">T.P. Per Box</th>
                    <th style="width: 9%;">Gross Amount</th>
                    <th style="width: 8%;">Total Discount</th>
                    <th style="width: 8%;">Net Amount</th>
                    <th style="width: 8%;">N.P Per Box</th>
                </tr>
            </thead>
            <tbody>
                ${itemRows}
                <!-- 📊 Summary Total Row -->
                <tr class="total-row">
                    <td class="col-center" style="font-weight:bold;">Total</td>
                    <td class="col-center">-</td>
                    <td class="col-center">${totalCtn > 0 ? totalCtn : '-'}</td>
                    <td class="col-center">${totalBox}</td>
                    <td class="col-center">${totalFreeUnits > 0 ? totalFreeUnits : '-'}</td>
                    <td class="col-center">-</td>
                    <td class="col-right">${totalGross.toFixed(2)}</td>
                    <td class="col-right">${totalDiscount.toFixed(2)}</td>
                    <td class="col-right">${roundedNetInvoice}</td>
                    <td class="col-center">-</td>
                </tr>
            </tbody>
        </table>

        <!-- 📊 LOWER SECTION (Promotions Left + Calculation Right) -->
        <table class="bottom-split">
            <tr>
                <!-- Left: Promotions Applied Box & Load Form # -->
                <td style="width: 56%; padding-right: 12px;">
                    <table class="promo-table">
                        <thead>
                            <tr>
                                <th colspan="2" class="promo-header-main">Promotions Applied</th>
                            </tr>
                            <tr>
                                <th class="promo-sub-l">Discount Summary</th>
                                <th class="promo-sub-r">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${promoRows}
                            <tr class="total-row">
                                <td class="promo-tot-lbl">Total Discount</td>
                                <td class="promo-tot-val">${totalDiscount.toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>
                    <div class="load-form-text">${loadFormNo}</div>
                </td>

                <!-- Right: Financial Summary Box -->
                <td style="width: 44%;">
                    <table class="calc-table">
                        <tr>
                            <td class="c-lbl">Gross Amount:</td>
                            <td class="c-val">${totalGross.toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td class="c-lbl">Total Discount:</td>
                            <td class="c-val">${totalDiscount.toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td class="c-lbl">Net Invoice Amount:</td>
                            <td class="c-val">${roundedNetInvoice}</td>
                        </tr>
                        <tr>
                            <td class="c-lbl">Special TO:</td>
                            <td class="c-val">${specialTO}</td>
                        </tr>
                        <tr class="c-net-row">
                            <td class="c-lbl">Net Invoice Amount:</td>
                            <td class="c-val">${roundedNetInvoice}</td>
                        </tr>
                        ${parseFloat(tot.prevBalance || 0) > 0 ? `
                        <tr>
                            <td class="c-lbl">Previous Balance:</td>
                            <td class="c-val">Rs ${tot.prevBalance}</td>
                        </tr>
                        <tr>
                            <td class="c-lbl">Amount Received:</td>
                            <td class="c-val">- Rs ${tot.received}</td>
                        </tr>
                        <tr style="background:#e2e8f0; font-weight:bold;">
                            <td class="c-lbl">Net Store Balance:</td>
                            <td class="c-val">Rs ${tot.balance}</td>
                        </tr>
                        ` : ''}
                    </table>
                </td>
            </tr>
        </table>

        <!-- ✍️ THREE SIGNATURE BOXES (Checked By Order Booker, Delivered By, Shop Keeper) -->
        <table class="sig-table">
            <tr>
                <td>
                    <div class="sig-person-name">${checkedByBooker}</div>
                    <div class="sig-box">Checked By Order Booker</div>
                </td>
                <td>
                    <div class="sig-person-name">${deliveredBy}</div>
                    <div class="sig-box">Delivered By</div>
                </td>
                <td>
                    <div class="sig-person-name">&nbsp;</div>
                    <div class="sig-box">Shop Keeper</div>
                </td>
            </tr>
        </table>

        <!-- 🟣 AUTHENTIC URDU HANDWRITTEN STAMP -->
        <div class="urdu-stamp-container">
            <div class="urdu-stamp-title">نوٹ</div>
            <div class="urdu-stamp-body">
                برائے مہربانی آرڈر بکر یا سپلائی مین سے بل لے کر رقم دیں اور کریڈٹ بل ایک ہفتہ میں ادا کریں۔ شکریہ
            </div>
            <div class="urdu-stamp-sign">
                <span>دستخط نمائندہ: ___________________</span>
                <span>مہر ایجنسی: ___________________</span>
            </div>
        </div>
    </body>
    </html>
    `;
}

// ============================================
// ============================================
// 🎨 TEMPLATE 8: 🇵🇰 CLASSIC WHOLESALE URDU GRID INVOICE
// Recreated with 100% fidelity from Ali Raza Traders Distribution Invoice (User Reference Photo)
// Features: Exact 4-Row Meta Header Grid, 7-Column Items Table (تفصیل، تعداد، ریٹ، گراس رقم، ڈسکاؤنٹ، سکیم، میزان),
// Summary row (0-5-0), Legal conditions box, Freight/Other/Tax/PrevBal/Total calculations,
// Sized for Half-Legal / A5 Portrait (8.5in x 7in) fitting 10-15 items per page cleanly!
// ============================================
function template8WholesaleUrduGrid(bill, agency, customer, settings) {
    const s = settings || (window.ebPrintEngine ? window.ebPrintEngine.getEffectivePrintSettings(agency) : {});
    const items = getTemplateItems(bill);
    const tot = getTemplateTotals(bill);
    const dateStr = bill.date || '-';
    const timeStr = bill.time || '-';
    const bookerName = bill.bookerName || bill.salesmanName || agency.ownerName || '';
    const bookerMobile = bill.bookerMobile || '';
    const billNo = bill.billNo || 'INV-001';
    const payType = bill.payType || (agency.payType || 'CASH');

    // Calculate totals breakdown for the 7 columns
    let totalQty = 0;
    let totalGross = 0;
    let totalDisc = 0;
    let totalScheme = 0;
    let totalNet = 0;

    const formattedRows = (bill.items || []).map((it, idx) => {
        const qtyNum = parseFloat(it.qty) || 0;
        const rateNum = parseFloat(it.rate) || 0;
        const gross = qtyNum * rateNum;
        const discountVal = parseFloat(it.discount) || 0;
        const schemeVal = parseFloat(it.schemeDiscount || it.schemeVal) || 0;
        const netTotal = it.total !== undefined ? parseFloat(it.total) : (gross - discountVal - schemeVal);

        totalQty += qtyNum;
        totalGross += gross;
        totalDisc += discountVal;
        totalScheme += schemeVal;
        totalNet += netTotal;

        const unitStr = it.unit ? it.unit : (qtyNum > 1 ? 'بکس' : 'عدد');
        const packingStr = it.packing ? ` (${it.packing})` : '';

        return `
        <tr>
            <td class="t-name urdu">${it.name}${packingStr}</td>
            <td class="t-center urdu">${qtyNum} ${unitStr}</td>
            <td class="t-num">${rateNum.toFixed(2)}</td>
            <td class="t-num">${gross.toFixed(2)}</td>
            <td class="t-num">${discountVal > 0 ? discountVal.toFixed(2) + '%' : '0.00%'}</td>
            <td class="t-num">${schemeVal > 0 ? schemeVal.toFixed(2) : '0.00'}</td>
            <td class="t-num"><b>${netTotal.toFixed(2)}</b></td>
        </tr>`;
    }).join('');

    // Summary unit format e.g. "0 - 5 - 0"
    const totalQtySummary = `0 - ${totalQty} - 0`;

    // Customer display string
    const custCode = customer.code || (customer.id ? customer.id.slice(-4) : '');
    const custDisplayName = customer.shopName ? `${customer.shopName} (${customer.name})` : (customer.name || 'Counter Sale');

    return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ur">
    <head>
        <meta charset="utf-8">
        <title>Invoice ${billNo} — ${agency.name || 'Ali Raza Traders'}</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap');
            @media print {
                @page { 
                    size: 8.5in 7in; 
                    margin: 4mm 6mm; 
                }
                body { margin: 0; padding: 0; }
                .no-print { display: none !important; }
            }
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                color: #000;
                font-size: 11.5px;
                line-height: 1.25;
                margin: 0 auto;
                max-width: 820px;
                padding: 6px 12px;
                direction: rtl;
                background: #fff;
            }
            .urdu { font-family: 'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', Arial, serif; }

            /* 🏢 HEADER SECTION */
            .header-sec {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 6px;
                padding-bottom: 4px;
            }
            .header-left {
                width: 28%;
                text-align: left;
                direction: ltr;
                font-size: 11.5px;
                font-weight: bold;
                line-height: 1.4;
            }
            .header-center {
                width: 44%;
                text-align: center;
                line-height: 1.3;
            }
            .agency-title {
                font-size: 27px;
                font-weight: 900;
                margin: 0;
                line-height: 1.4;
                color: #000;
            }
            .agency-sub {
                font-size: 12.5px;
                font-weight: bold;
                margin: 1px 0;
            }
            .agency-proprietor {
                font-size: 11.5px;
                font-weight: bold;
                margin-top: 1px;
            }
            .header-right {
                width: 28%;
                text-align: right;
                line-height: 1.4;
            }
            .badge-paytype {
                font-size: 22px;
                font-weight: 900;
                letter-spacing: 1.5px;
                font-family: 'Segoe UI', Arial, sans-serif;
                margin-bottom: 2px;
            }
            .bill-timestamp {
                font-size: 11px;
                font-weight: bold;
                direction: ltr;
                display: inline-block;
            }

            /* 📋 4-ROW META GRID (Bordered Table matching receipt photo) */
            .meta-grid {
                width: 100%;
                border-collapse: collapse;
                border: 1.5px solid #000;
                margin-bottom: 6px;
                font-size: 11.5px;
            }
            .meta-grid td {
                border: 1px solid #000;
                padding: 4px 6px;
                vertical-align: middle;
            }
            .meta-grid .t-ltr {
                text-align: left;
                direction: ltr;
                font-weight: bold;
            }
            .meta-grid .t-rtl {
                text-align: right;
                direction: rtl;
            }

            /* 📦 ITEMS TABLE (7 Exact Columns matching photo) */
            .grid-table {
                width: 100%;
                border-collapse: collapse;
                border: 1.5px solid #000;
                margin-bottom: 6px;
                font-size: 11px;
            }
            .grid-table th {
                border: 1px solid #000;
                background: #f1f5f9;
                padding: 4px 4px;
                font-weight: 800;
                text-align: center;
                color: #000;
            }
            .grid-table td {
                border: 1px solid #333;
                padding: 3.5px 5px;
                vertical-align: middle;
            }
            .t-name {
                text-align: right;
                font-weight: 700;
                padding-right: 6px !important;
            }
            .t-center {
                text-align: center;
                font-weight: 600;
            }
            .t-num {
                text-align: right;
                direction: ltr;
                font-weight: 600;
                font-family: 'Segoe UI', Tahoma, sans-serif;
            }
            .summary-row td {
                font-weight: 800;
                background: #f8fafc;
                border-top: 1.5px solid #000;
            }

            /* 📊 LOWER SECTION (Terms Box Right + Calculations Box Left) */
            .footer-table {
                width: 100%;
                border-collapse: collapse;
                border: 1.5px solid #000;
                margin-top: 2px;
            }
            .footer-table td {
                vertical-align: top;
                padding: 6px 10px;
            }
            .terms-box {
                font-size: 10.5px;
                line-height: 1.8;
                font-weight: 700;
                text-align: right;
            }
            .calc-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 11.5px;
            }
            .calc-table td {
                padding: 2.5px 4px;
            }
            .calc-table .c-lbl {
                text-align: right;
                font-weight: 700;
            }
            .calc-table .c-val {
                text-align: left;
                direction: ltr;
                font-weight: 800;
                font-family: 'Segoe UI', Tahoma, sans-serif;
            }
            .calc-table .grand-row td {
                font-size: 13px;
                font-weight: 900;
                border-top: 1px solid #000;
                border-bottom: 1px solid #000;
                padding: 3px 4px;
            }

            /* 🖨️ STATUS FOOTER */
            .bottom-status-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 10px;
                font-weight: 700;
                margin-top: 10px;
                border-top: 1px solid #94a3b8;
                padding-top: 4px;
                direction: ltr;
                font-family: 'Segoe UI', Tahoma, sans-serif;
            }
        </style>
    </head>
    <body>
        <!-- 🏢 HEADER (Exact Match: Ali Raza Traders Sample Photo) -->
        <div class="header-sec">
            <!-- Left: Mobile, Phone & Optional Logo -->
            <div class="header-left">
                ${(s.showLogo !== false && agency.logo) ? `<img src="${agency.logo}" style="max-height:45px; max-width:130px; object-fit:contain; margin-bottom:4px; display:block;" alt="Logo">` : ''}
                ${s.showMobiles ? `
                    <div style="font-size:13px; font-weight:800; font-family:'Segoe UI',Arial,sans-serif;">${agency.mobile || ''}</div>
                    ${agency.ownerName ? `<div class="urdu" style="font-size:12px; font-weight:700;">${agency.ownerName}</div>` : ''}
                ` : '<div>&nbsp;</div>'}
                ${s.showNTN && agency.ntn ? `<div style="font-size:10.5px;">NTN: ${agency.ntn}</div>` : ''}
                ${s.showLicence && agency.licenceNo ? `<div style="font-size:10.5px;">Licence: ${agency.licenceNo}</div>` : ''}
            </div>

            <!-- Center: Main Urdu Agency Title & Market Center -->
            <div class="header-center">
                ${s.showAgencyName ? `<h1 class="agency-title urdu">${agency.name || ''}</h1>` : ''}
                ${s.showAddress ? `<div class="agency-sub urdu">${agency.address || ''} ${agency.city ? agency.city : ''}</div>` : ''}
                ${s.showOwnerName && agency.ownerName ? `<div class="agency-proprietor urdu" style="font-size:12px;">میاں ناصر محمود &nbsp;&nbsp; ${agency.ownerName}</div>` : ''}
            </div>

            <!-- Right: Big CASH Tag & Live Timestamp -->
            <div class="header-right">
                <div class="badge-paytype">${s.showPayType ? payType : ''}</div>
                <div class="bill-timestamp">${s.showTime ? timeStr : ''} &nbsp;&nbsp; ${s.showDate ? dateStr : ''}</div>
            </div>
        </div>

        <!-- 📋 4-ROW META GRID (Bordered Table matching receipt photo) -->
        <table class="meta-grid">
            <!-- Row 1: Mobile Left, Customer Name Right -->
            <tr>
                <td style="width: 22%;" class="t-ltr">
                    ${s.showCustomerPhone ? (customer.mobile || '') : ''}
                </td>
                <td colspan="3" style="width: 78%;" class="t-rtl urdu">
                    <span style="font-weight:bold;">بل بنام :</span> &nbsp;&nbsp;
                    ${custCode ? `( <b style="font-family:'Segoe UI',sans-serif;">${custCode}</b> ) &nbsp;&nbsp;` : ''}
                    <b style="font-size:13.5px;">${custDisplayName}</b>
                </td>
            </tr>

            <!-- Row 2: Bill No Left, Salesman / Booker Right -->
            <tr>
                <td style="width: 22%;" class="t-rtl urdu">
                    ${s.showBillNo ? `<span style="font-weight:bold;">بل نمبر :</span> &nbsp;&nbsp;<b style="font-family:'Segoe UI',sans-serif; font-size:13px;">${billNo}</b>` : ''}
                </td>
                <td colspan="3" style="width: 78%;" class="t-rtl urdu">
                    ${s.showBookerName ? `<span style="font-weight:bold;">سیلزمین :</span> &nbsp;&nbsp;<b>${bookerName || ''}</b> &nbsp;&nbsp;<span class="t-ltr" style="font-family:'Segoe UI',sans-serif; font-weight:bold; margin-right:8px;">${bookerMobile || ''}</span>` : ''}
                </td>
            </tr>

            <!-- Row 3: Bill Date Left, Area Middle, Route Right -->
            <tr>
                <td style="width: 22%;" class="t-rtl urdu">
                    ${s.showDate ? `<span style="font-weight:bold;">بل تاریخ :</span> &nbsp;&nbsp;<span style="font-family:'Segoe UI',sans-serif; font-weight:bold;">${dateStr}</span>` : ''}
                </td>
                <td style="width: 40%;" class="t-rtl urdu">
                    ${s.showCustomerAddress ? (customer.address || customer.area || 'تاج چوک بائی پاس') : ''}
                </td>
                <td colspan="2" style="width: 38%;" class="t-rtl urdu">
                    ${s.showCustomerRoute ? `<span style="font-weight:bold;">روٹ :</span> &nbsp;&nbsp;<b>${customer.route || bill.customerRoute || 'جنرل'}</b>` : ''}
                </td>
            </tr>

            <!-- Row 4: Summary No Left, Delivery Man Middle, CNIC/NTN Right -->
            <tr>
                <td style="width: 22%;" class="t-rtl urdu">
                    <span style="font-weight:bold;">سمری نمبر :</span> &nbsp;&nbsp;<b style="font-family:'Segoe UI',sans-serif;">${bill.summaryNo || '0'}</b>
                </td>
                <td style="width: 40%;" class="t-rtl urdu">
                    <span style="font-weight:bold;">ڈیلیوری مین :</span> &nbsp;&nbsp;<b>${bill.supplierName || bill.deliveryMan || 'All'}</b>
                </td>
                <td colspan="2" style="width: 38%;" class="t-rtl urdu">
                    <span style="font-weight:bold;">آئی ڈی کارڈ :</span> &nbsp;&nbsp;<span style="font-family:'Segoe UI',sans-serif; font-weight:bold;">${customer.ntn || customer.cnic || ''}</span>
                    ${customer.fbrStatus ? `<span style="font-weight:bold; margin-right:4px; padding:1px 5px; border-radius:3px; font-size:9.5px; ${customer.isFiler ? 'background:#dcfce7; color:#15803d; border:1px solid #86efac;' : 'background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5;'}">(${customer.isFiler ? '🟢 فائلر' : '🔴 نان فائلر'})</span>` : ''}
                </td>
            </tr>
        </table>

        <!-- 📦 7-COLUMN ITEMS TABLE (تفصیل، تعداد، ریٹ، گراس رقم، ڈسکاؤنٹ، سکیم، میزان) -->
        <table class="grid-table">
            <thead>
                <tr>
                    <th style="width: 42%; text-align:right; padding-right:8px;" class="urdu">تفصیل</th>
                    <th style="width: 13%;" class="urdu">تعداد</th>
                    <th style="width: 9%;" class="urdu">ریٹ</th>
                    <th style="width: 12%;" class="urdu">گراس رقم</th>
                    <th style="width: 8%;" class="urdu">ڈسکاؤنٹ</th>
                    <th style="width: 8%;" class="urdu">سکیم</th>
                    <th style="width: 12%;" class="urdu">میزان</th>
                </tr>
            </thead>
            <tbody>
                ${formattedRows}
                <!-- 📊 Summary Row -->
                <tr class="summary-row">
                    <td class="urdu" style="text-align:center; font-weight:800; font-size:12px;">میزان</td>
                    <td class="urdu" style="text-align:center; font-weight:800; font-family:'Segoe UI',sans-serif; font-size:11.5px;">${totalQtySummary}</td>
                    <td></td>
                    <td class="t-num"><b>${totalGross.toFixed(2)}</b></td>
                    <td class="t-num">${totalDisc.toFixed(2)}</td>
                    <td class="t-num">${totalScheme.toFixed(2)}</td>
                    <td class="t-num"><b>${totalNet.toFixed(2)}</b></td>
                </tr>
            </tbody>
        </table>

        <!-- 📊 LOWER SECTION (Terms Box Right + Calculations Box Left) -->
        <table class="footer-table">
            <tr>
                <!-- Legal Terms & Conditions (Photo Match) -->
                <td style="width: 58%; border-left: 1.5px solid #000;">
                    ${s.showTermsAndConditions !== false ? `
                    <div class="terms-box urdu">
                        سٹاک موقع پر چیک کریں بعد از ادارہ ذمہ دار نہ ہوگا<br>
                        آرڈر بکر یا سپلائر کے ذاتی لین دین کا ادارہ ذمہ دار نہ ہوگا<br>
                        چوہے کے کاٹے یا ڈیمیج کا کوئی کلیم نہ ہوگا<br>
                        ${agency.invoiceFooter ? agency.invoiceFooter : ''}
                    </div>` : ''}
                </td>

                <!-- Financial Calculations (Freight, Other, Tax, Grand Total, Previous, Total Due) -->
                <td style="width: 42%;">
                    <table class="calc-table">
                        <tr>
                            <td class="c-lbl urdu">کرایہ (-) :</td>
                            <td class="c-val">${parseFloat(bill.freight || 0).toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td class="c-lbl urdu">دیگر (+) :</td>
                            <td class="c-val">${parseFloat(bill.otherCharges || 0).toFixed(2)}</td>
                        </tr>
                        ${(s.showTax && (parseFloat(bill.taxAmount || 0) > 0 || (bill.taxRate && parseFloat(bill.taxRate) > 0))) ? `
                        <tr>
                            <td class="c-lbl urdu">FBR ایڈوانس ٹیکس (${customer.isFiler ? 'فائلر' : 'نان فائلر'} ${bill.taxRate ? bill.taxRate + '%' : ''}) :</td>
                            <td class="c-val">+ ${parseFloat(bill.taxAmount || 0).toFixed(2)}</td>
                        </tr>` : ''}
                        <tr class="grand-row">
                            <td class="c-lbl urdu">واجب الادا :</td>
                            <td class="c-val">${tot.grandTotal}</td>
                        </tr>
                        ${s.showPreviousBalance !== false ? `
                        <tr>
                            <td class="c-lbl urdu">سابقہ بیلنس :</td>
                            <td class="c-val">(${tot.prevBalance})</td>
                        </tr>` : ''}
                        ${s.showReceivedAmount !== false && parseFloat(tot.received) > 0 ? `
                        <tr>
                            <td class="c-lbl urdu">وصول شدہ :</td>
                            <td class="c-val">- ${tot.received}</td>
                        </tr>` : ''}
                        ${s.showBalance !== false ? `
                        <tr style="font-weight:900; font-size:13px;">
                            <td class="c-lbl urdu">ٹوٹل بقایا :</td>
                            <td class="c-val"><b>${tot.balance}</b></td>
                        </tr>` : ''}
                    </table>
                </td>
            </tr>
        </table>

        <!-- ✍️ SIGNATURES ROW -->
        <table style="width:100%; margin-top:8px; border-top:1px dashed #94a3b8; padding-top:4px; font-size:10.5px; text-align:center;">
            <tr>
                <td style="width:33.3%;">
                    ${s.showSignatureCustomer !== false ? `<div style="border-top:1px solid #000; width:130px; margin:14px auto 2px; padding-top:2px;" class="urdu">دستخط وصول کنندہ / گاہک</div>` : ''}
                </td>
                <td style="width:33.3%;">
                    ${s.showSignatureBooker !== false ? `<div style="border-top:1px solid #000; width:130px; margin:14px auto 2px; padding-top:2px;" class="urdu">دستخط آرڈر بکر / سیلزمین</div>` : ''}
                </td>
                <td style="width:33.3%;">
                    ${s.showSignatureAuthorized !== false ? `<div style="border-top:1px solid #000; width:130px; margin:14px auto 2px; padding-top:2px;" class="urdu">دستخط برائے ادارہ / مہر</div>` : ''}
                </td>
            </tr>
        </table>

        <!-- 🖨️ STATUS FOOTER (PC / User / Phone / Page) -->
        <div class="bottom-status-row">
            <span>PC: &nbsp;${agency.terminalId || 'DESKTOP-UI3QMEK'}</span>
            <span>User: &nbsp;${(typeof myUser !== 'undefined' && myUser && myUser.name) ? myUser.name : '4'}</span>
            <span>${agency.mobile ? agency.mobile : '3232590'}</span>
            <span>Page 1 of 1</span>
        </div>
    </body>
    </html>
    `;
}

// ============================================
// 🎨 TEMPLATE 9: 🇵🇰 ABID TRADERS SALES INVOICE (MANTHAR ROAD SADIQABAD)
// 100% Fidelity Recreation from Authentic Abid Traders Wholesale Invoices (Samples 3, 4, 6)
// Features: Top Centered Header (Abid Traders / Manthar Road Sadiq Abad / ph.03008674728 / سیلز انوائس)
// 3-Row Meta Grid: (بل نمبر, آخری بل تاریخ, تاریخ / گاہک نام, شناختی کارڈ / ایڈریس, سیلزمین)
// 9-Column Items Table RTL: (تعداد, کارٹن, بونس, تفصیل, ریٹ, T-D, T-O, S-D, قیمت)
// Lower Section: Khata Balance Box Right (سابقہ بقایا, موجودہ بقایا), Calculation Box Left (گراس رقم, ڈسکاؤنٹ, فلیٹ ڈسکاؤنٹ, میزان)
// Watermark Stamp: "کریڈٹ 7 دن", Three Signature Lines: Checked By Order Booker, Delivered By, Shop Keeper
// Legal Disclaimer: سیلزمین کے ذاتی لین دین کا کمپنی ذمہ دار نہ ہوگی سٹاک اور ایکسپائری موقع پر چیک کر لیں بعد ازاں کمپنی ذمہ دار نہ ہوگی جوس کی ایکسپائری کا کلیم نہیں ہے
// Footer: Page 1 Of 1, Live Date-Time, Software credit.
// ============================================
function template9AbidTraders(bill, agency, customer, settings) {
    const s = settings || (window.ebPrintEngine ? window.ebPrintEngine.getEffectivePrintSettings(agency) : {});
    const tot = getTemplateTotals(bill);
    const dateStr = bill.date || (bill.invoiceDate || new Date().toLocaleDateString('en-GB'));
    const lastBillDateStr = bill.lastBillDate || bill.prevBillDate || (customer.lastBillAt ? customer.lastBillAt.slice(0, 10) : '20-09-2026');
    const billNo = bill.billNo || '8012';
    const salesmanName = bill.salesmanName || bill.bookerName || 'REHAN';
    const salesmanMobile = bill.salesmanMobile || bill.bookerMobile || '03028389183';
    const creditTerms = bill.creditTerms || 'کریڈٹ 7 دن';
    const flatDiscount = parseFloat(bill.flatDiscount || 0);

    const agencyName = agency.name || 'Abid Traders';
    const agencyAddress = agency.address ? agency.address + (agency.city ? ' ' + agency.city : '') : 'Manthar Road Sadiq Abad';
    const agencyPhone = agency.mobile || agency.phone || '03008674728';

    const custName = customer.shopName ? customer.shopName : (customer.name || 'تاج کریانہ سٹور');
    const custMobile = customer.mobile || customer.phone || '03146800959';
    const custCnic = customer.cnic || customer.ntn || '';
    const custAddress = customer.address || customer.area || 'تاج چوک بائی پاس';

    let totalPieces = 0;
    let totalCtn = 0;
    let totalBonus = 0;
    let totalGross = 0;
    let totalTD = 0;
    let totalTO = 0;
    let totalSD = 0;
    let totalNet = 0;

    const rawItems = (Array.isArray(bill.items) && bill.items.length > 0) ? bill.items : [
        {
            name: "پارٹی جوس 250 ایم ایل بوتل 1*12",
            qty: 0,
            ctn: 1,
            bonus: 0,
            rate: 450.00,
            td: 0,
            to: 0,
            sd: 0,
            gross: 450.00,
            total: 450.00
        },
        {
            name: "پاپولر ملکرز زعفران بادام 1200 ایم ایل 1*12",
            qty: 0,
            ctn: 1,
            bonus: 0,
            rate: 700.00,
            td: 0,
            to: 0,
            sd: 0,
            gross: 700.00,
            total: 700.00
        },
        {
            name: "ٹروپی کنگ جوس مینگو 1200 ایم ایل 1*24",
            qty: 0,
            ctn: 1,
            bonus: 0,
            rate: 750.00,
            td: 0,
            to: 0,
            sd: 0,
            gross: 750.00,
            total: 750.00
        },
        {
            name: "ٹروپی کنگ سیب جوس 1200 ایم ایل 1*24",
            qty: 0,
            ctn: 1,
            bonus: 0,
            rate: 750.00,
            td: 0,
            to: 0,
            sd: 0,
            gross: 750.00,
            total: 750.00
        }
    ];

    const itemRows = rawItems.map((it) => {
        const ctnVal = parseFloat(it.ctn) || 0;
        if (ctnVal > 0) totalCtn += ctnVal;

        const qtyVal = parseFloat(it.qty) || 0;
        if (qtyVal > 0) totalPieces += qtyVal;

        const bonusVal = parseFloat(it.bonus || it.freeUnits || it.freeQty) || 0;
        if (bonusVal > 0) totalBonus += bonusVal;

        const rateVal = parseFloat(it.rate) || 0;
        const tdVal = parseFloat(it.td || it.tradeDiscount) || 0;
        if (tdVal > 0) totalTD += tdVal;

        const toVal = parseFloat(it.to || it.tradeOffer) || 0;
        if (toVal > 0) totalTO += toVal;

        const sdVal = parseFloat(it.sd || it.specialDiscount || it.schemeDiscount) || 0;
        if (sdVal > 0) totalSD += sdVal;

        const gross = it.gross !== undefined ? parseFloat(it.gross) : (ctnVal > 0 ? (ctnVal * rateVal) : (qtyVal * rateVal));
        totalGross += gross;

        const net = it.total !== undefined ? parseFloat(it.total) : Math.max(0, gross - tdVal - toVal - sdVal);
        totalNet += net;

        return `
        <tr>
            <td class="t-center en-num">${qtyVal > 0 && ctnVal > 0 ? qtyVal : (ctnVal === 0 && qtyVal > 0 ? qtyVal : '-')}</td>
            <td class="t-center en-num font-bold">${ctnVal > 0 ? ctnVal : (it.unit === 'ctn' || it.unit === 'carton' ? qtyVal : '-')}</td>
            <td class="t-center en-num">${bonusVal > 0 ? bonusVal : '-'}</td>
            <td class="t-desc urdu">${it.name}</td>
            <td class="t-num en-num">${rateVal.toFixed(2)}</td>
            <td class="t-center en-num">${tdVal > 0 ? tdVal.toFixed(2) : '-'}</td>
            <td class="t-center en-num">${toVal > 0 ? toVal.toFixed(2) : '-'}</td>
            <td class="t-center en-num">${sdVal > 0 ? sdVal.toFixed(2) : '-'}</td>
            <td class="t-num en-num font-bold">${Math.round(net).toLocaleString()}</td>
        </tr>`;
    }).join('');

    const roundedNet = Math.round(totalNet);
    const overallDiscount = totalTD + totalTO + totalSD + parseFloat(tot.discount || 0);
    const finalBalance = parseFloat(tot.balance) > 0 ? tot.balance : roundedNet.toLocaleString();

    // Live formatted timestamp
    const now = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayName = days[now.getDay()];
    const dateFormatted = `${String(now.getDate()).padStart(2, '0')}-${months[now.getMonth()]}-${now.getFullYear()}`;
    const timeFormatted = now.toLocaleTimeString('en-US', { hour12: true });
    const liveDateTimeStr = `${dayName}, ${dateFormatted} ${timeFormatted}`;

    return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ur">
    <head>
        <meta charset="utf-8">
        <title>Sales Invoice - ${billNo} - ${agencyName}</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap');

            @media print {
                @page {
                    size: A4 portrait;
                    margin: 8mm 10mm;
                }
                body {
                    margin: 0;
                    padding: 0;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                .no-print { display: none !important; }
            }

            * {
                box-sizing: border-box;
            }

            body {
                font-family: Arial, 'Segoe UI', Tahoma, sans-serif;
                color: #000;
                background: #fff;
                margin: 0 auto;
                padding: 12px 18px;
                max-width: 820px;
                font-size: 11.5px;
                line-height: 1.25;
                direction: rtl;
            }

            .urdu {
                font-family: 'Noto Nastaliq Urdu', Arial, serif;
            }

            .en-num {
                font-family: Arial, 'Segoe UI', Tahoma, sans-serif;
                direction: ltr;
                display: inline-block;
            }

            .font-bold {
                font-weight: bold;
            }

            /* 🏢 HEADER SECTION (Exact match to Abid Traders) */
            .abid-header {
                text-align: center;
                margin-bottom: 8px;
            }
            .abid-title {
                font-size: 26px;
                font-weight: 900;
                color: #1e293b;
                margin: 0 0 2px 0;
                letter-spacing: 0.5px;
                font-family: Arial, sans-serif;
            }
            .abid-sub {
                font-size: 13px;
                font-weight: 600;
                color: #334155;
                margin: 1px 0;
            }
            .abid-phone {
                font-size: 12.5px;
                font-weight: 600;
                color: #334155;
                margin: 1px 0;
            }
            .abid-ur-type {
                font-size: 17px;
                font-weight: 700;
                color: #000;
                margin-top: 2px;
                line-height: 1.6;
            }

            /* 📋 3-ROW META GRID */
            .abid-meta-tbl {
                width: 100%;
                border-collapse: collapse;
                border: 1px solid #222;
                margin-bottom: 8px;
                font-size: 11px;
            }
            .abid-meta-tbl td {
                border: 1px solid #444;
                padding: 3px 6px;
                vertical-align: middle;
            }
            .meta-th {
                font-weight: bold;
                text-align: right;
                background: #fbfbfb;
                color: #000;
                white-space: nowrap;
            }
            .meta-td-en {
                text-align: center;
                font-weight: 600;
                font-family: Arial, sans-serif;
            }
            .meta-td-cust {
                text-align: right;
                font-size: 12px;
            }
            .meta-td-val {
                text-align: right;
            }

            /* 📦 9-COLUMN ITEMS TABLE */
            .abid-items-tbl {
                width: 100%;
                border-collapse: collapse;
                border: 1px solid #222;
                margin-bottom: 6px;
                font-size: 10.5px;
            }
            .abid-items-tbl th {
                border: 1px solid #333;
                background: #f1f1f1;
                font-weight: bold;
                text-align: center;
                padding: 4px 3px;
                color: #000;
                font-size: 10px;
            }
            .abid-items-tbl td {
                border: 1px solid #444;
                padding: 3.5px 4px;
                color: #000;
            }
            .t-center {
                text-align: center;
            }
            .t-num {
                text-align: right;
                font-family: Arial, sans-serif;
                direction: ltr;
            }
            .t-desc {
                text-align: right;
                font-weight: 600;
                font-size: 11px;
                padding-right: 6px;
                word-wrap: break-word;
            }

            /* TOTAL ROW */
            .abid-total-row td {
                border-top: 1.5px solid #000;
                border-bottom: 1.5px solid #000;
                font-weight: bold;
                background: #fcfcfc;
                padding: 4px 3px;
            }

            /* 📊 LOWER SECTION (WATERMARK & 2-BOX CALCULATION SPLIT) */
            .abid-lower-wrap {
                position: relative;
                margin-top: 4px;
                margin-bottom: 8px;
            }
            .abid-watermark {
                position: absolute;
                top: 40%;
                left: 50%;
                transform: translate(-50%, -50%) rotate(-4deg);
                font-size: 46px;
                font-weight: 700;
                color: rgba(99, 102, 241, 0.22);
                pointer-events: none;
                z-index: 0;
                white-space: nowrap;
                letter-spacing: 2px;
                font-family: 'Noto Nastaliq Urdu', serif;
            }

            .abid-split-tbl {
                width: 100%;
                border-collapse: collapse;
                position: relative;
                z-index: 1;
            }

            /* KHATA BOX (RIGHT) */
            .abid-khata-box {
                width: 100%;
                border-collapse: collapse;
                border: 1px solid #222;
                background: rgba(255, 255, 255, 0.9);
            }
            .abid-khata-box td {
                border: 1px solid #444;
                padding: 4px 8px;
                font-size: 11.5px;
            }
            .k-lbl {
                text-align: right;
                font-weight: bold;
                width: 50%;
            }
            .k-val {
                text-align: left;
                width: 50%;
                font-family: Arial, sans-serif;
                direction: ltr;
            }

            /* CALCULATION BOX (LEFT) */
            .abid-calc-box {
                width: 100%;
                border-collapse: collapse;
                border: 1px solid #222;
                background: rgba(255, 255, 255, 0.9);
            }
            .abid-calc-box td {
                border: 1px solid #444;
                padding: 3px 8px;
                font-size: 11px;
            }
            .c-lbl {
                text-align: right;
                font-weight: bold;
                width: 55%;
            }
            .c-val {
                text-align: left;
                width: 45%;
                font-family: Arial, sans-serif;
                direction: ltr;
            }
            .c-grand-row td {
                background: #f1f1f1;
                font-weight: bold;
                font-size: 12px;
            }

            /* ✍️ THREE SIGNATURE LINES */
            .abid-sig-row {
                display: flex;
                justify-content: space-between;
                align-items: flex-end;
                margin-top: 28px;
                padding: 0 10px;
                direction: ltr;
            }
            .abid-sig-col {
                width: 30%;
                text-align: center;
            }
            .abid-sig-line {
                border-top: 1.5px solid #000;
                margin-bottom: 4px;
            }
            .abid-sig-label {
                font-size: 10.5px;
                font-weight: bold;
                color: #000;
            }

            /* 📜 LEGAL TERMS (Exact wording from sample photo) */
            .abid-terms {
                margin-top: 14px;
                font-size: 11px;
                font-weight: 700;
                line-height: 1.8;
                text-align: center;
                color: #111;
                padding: 0 4px;
            }

            /* 🖋️ AUTHENTIC VERIFICATION STAMP & OVERLAY */
            .abid-stamp-container {
                display: flex;
                justify-content: center;
                align-items: center;
                margin-top: 14px;
                margin-bottom: 8px;
            }
            .abid-stamp-box {
                border: 2px dashed #1e3a8a;
                color: #1e3a8a;
                padding: 6px 18px;
                border-radius: 8px;
                text-align: center;
                transform: rotate(-3deg);
                background: rgba(30, 58, 138, 0.03);
                display: inline-block;
                min-width: 210px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            }
            .stamp-urdu-title {
                font-family: 'Noto Nastaliq Urdu', Arial, serif;
                font-size: 13px;
                font-weight: bold;
                line-height: 1.6;
            }
            .stamp-date-red {
                font-family: Arial, sans-serif;
                font-size: 12px;
                font-weight: 900;
                color: #b91c1c;
                letter-spacing: 1px;
                margin: 2px 0;
            }
            .stamp-urdu-sub {
                font-family: 'Noto Nastaliq Urdu', Arial, serif;
                font-size: 9.5px;
                font-weight: 600;
                line-height: 1.5;
            }

            /* 🖨️ FOOTER */
            .abid-footer {
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 10px;
                font-weight: 600;
                margin-top: 18px;
                padding-top: 4px;
                border-top: 1px solid #94a3b8;
                direction: ltr;
                font-family: Arial, sans-serif;
            }
            .abid-credit-footer {
                text-align: center;
                font-size: 9px;
                color: #475569;
                margin-top: 3px;
                direction: ltr;
                font-family: Arial, sans-serif;
            }
        </style>
    </head>
    <body>
        <!-- 🏢 HEADER (Exact Match: Abid Traders Sample Photo) -->
        <div class="abid-header">
            <h1 class="abid-title">${agencyName}</h1>
            <div class="abid-sub">${agencyAddress}</div>
            <div class="abid-phone">ph.${agencyPhone}</div>
            <div class="abid-ur-type urdu">سیلز انوائس</div>
        </div>

        <!-- 📋 3-ROW META GRID -->
        <table class="abid-meta-tbl urdu">
            <tr>
                <td style="width:12%;" class="meta-th">بل نمبر</td>
                <td style="width:21%;" class="meta-td-en"><b>${billNo}</b></td>
                <td style="width:15%;" class="meta-th">آخری بل تاریخ</td>
                <td style="width:18%;" class="meta-td-en">${lastBillDateStr}</td>
                <td style="width:12%;" class="meta-th">تاریخ</td>
                <td style="width:22%;" class="meta-td-en">${dateStr}</td>
            </tr>
            <tr>
                <td class="meta-th">گاہک نام</td>
                <td colspan="3" class="meta-td-cust">
                    <span class="en-num font-bold">${custMobile}</span>
                    ${custMobile && custName ? ' * ' : ''}
                    <b>${custName}</b>
                </td>
                <td class="meta-th">شناختی کارڈ</td>
                <td class="meta-td-en">${custCnic}</td>
            </tr>
            <tr>
                <td class="meta-th">ایڈریس</td>
                <td colspan="3" class="meta-td-val">${custAddress}</td>
                <td class="meta-th">سیلزمین</td>
                <td class="meta-td-en"><b>${salesmanName} ${salesmanMobile}</b></td>
            </tr>
        </table>

        <!-- 📦 9-COLUMN ITEMS TABLE (RTL) -->
        <table class="abid-items-tbl">
            <thead>
                <tr>
                    <th style="width:8%;" class="urdu">تعداد</th>
                    <th style="width:8%;" class="urdu">کارٹن</th>
                    <th style="width:8%;" class="urdu">بونس</th>
                    <th style="width:38%;" class="urdu">تفصیل</th>
                    <th style="width:10%;" class="urdu">ریٹ</th>
                    <th style="width:7%;">T-D</th>
                    <th style="width:7%;">T-O</th>
                    <th style="width:7%;">S-D</th>
                    <th style="width:11%;" class="urdu">قیمت</th>
                </tr>
            </thead>
            <tbody>
                ${itemRows}
                <!-- 📊 Summary Total Row -->
                <tr class="abid-total-row">
                    <td class="t-center en-num">${totalPieces > 0 && totalCtn > 0 ? totalPieces : '-'}</td>
                    <td class="t-center en-num font-bold">${totalCtn > 0 ? totalCtn : '-'}</td>
                    <td class="t-center en-num">${totalBonus > 0 ? totalBonus : '-'}</td>
                    <td class="t-center urdu font-bold">ٹوٹل</td>
                    <td class="t-center">-</td>
                    <td class="t-center en-num">${totalTD > 0 ? totalTD.toFixed(2) : '-'}</td>
                    <td class="t-center en-num">${totalTO > 0 ? totalTO.toFixed(2) : '-'}</td>
                    <td class="t-center en-num">${totalSD > 0 ? totalSD.toFixed(2) : '-'}</td>
                    <td class="t-num en-num font-bold">${roundedNet.toLocaleString()}</td>
                </tr>
            </tbody>
        </table>

        <!-- 📊 LOWER SECTION (Watermark + Khata Balance & Calculations Split) -->
        <div class="abid-lower-wrap">
            <!-- 🟣 Faint Authentic Watermark Stamp -->
            <div class="abid-watermark urdu">${creditTerms}</div>

            <table class="abid-split-tbl">
                <tr>
                    <!-- Right Box: Khata Balance (سابقہ بقایا, موجودہ بقایا) -->
                    <td style="width: 46%; vertical-align: top;">
                        <table class="abid-khata-box urdu">
                            <tr>
                                <td class="k-lbl">سابقہ بقایا</td>
                                <td class="k-val en-num">${parseFloat(tot.prevBalance) > 0 ? tot.prevBalance : '-'}</td>
                            </tr>
                            <tr>
                                <td class="k-lbl">موجودہ بقایا</td>
                                <td class="k-val en-num font-bold">${finalBalance}</td>
                            </tr>
                        </table>
                    </td>

                    <!-- Gap -->
                    <td style="width: 8%;"></td>

                    <!-- Left Box: Calculations (گراس رقم, ڈسکاؤنٹ, فلیٹ ڈسکاؤنٹ, میزان) -->
                    <td style="width: 46%; vertical-align: top;">
                        <table class="abid-calc-box urdu">
                            <tr>
                                <td class="c-lbl">گراس رقم</td>
                                <td class="c-val en-num">${Math.round(totalGross).toLocaleString()}</td>
                            </tr>
                            <tr>
                                <td class="c-lbl">ڈسکاؤنٹ</td>
                                <td class="c-val en-num">${overallDiscount > 0 ? overallDiscount.toFixed(2) : '-'}</td>
                            </tr>
                            <tr>
                                <td class="c-lbl">فلیٹ ڈسکاؤنٹ</td>
                                <td class="c-val en-num">${flatDiscount > 0 ? flatDiscount.toFixed(2) : '-'}</td>
                            </tr>
                            <tr class="c-grand-row">
                                <td class="c-lbl font-bold">میزان</td>
                                <td class="c-val en-num font-bold">${roundedNet.toLocaleString()}</td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </div>

        <!-- ✍️ THREE SIGNATURE LINES -->
        <div class="abid-sig-row">
            <div class="abid-sig-col">
                <div class="abid-sig-line"></div>
                <div class="abid-sig-label">Checked By Order Booker</div>
            </div>
            <div class="abid-sig-col">
                <div class="abid-sig-line"></div>
                <div class="abid-sig-label">Delivered By</div>
            </div>
            <div class="abid-sig-col">
                <div class="abid-sig-line"></div>
                <div class="abid-sig-label">Shop Keeper</div>
            </div>
        </div>

        <!-- 📜 LEGAL DISCLAIMER (Authentic match to receipt) -->
        <div class="abid-terms urdu">
            سیلزمین کے ذاتی لین دین کا کمپنی ذمہ دار نہ ہوگی سٹاک اور ایکسپائری موقع پر چیک کر لیں بعد ازاں کمپنی ذمہ دار نہ ہوگی جوس کی ایکسپائری کا کلیم نہیں ہے
        </div>

        <!-- 🖋️ Authentic Verification Stamp & Signatures (Matching Sample Photo) -->
        <div class="abid-stamp-container">
            <div class="abid-stamp-box">
                <div class="stamp-urdu-title">${custName || 'تاج کریانہ سٹور'}</div>
                <div class="stamp-date-red">${dateStr.slice(0, 11)}</div>
                <div class="stamp-urdu-sub">پروپرائیٹر / تاج چوک بائی پاس صادق آباد</div>
            </div>
        </div>

        <!-- 🖨️ FOOTER STATUS -->
        <div class="abid-footer">
            <span>Page 1 Of 1</span>
            <span>${liveDateTimeStr}</span>
        </div>
        <div class="abid-credit-footer">
            Develop and Design By Computiq Zone 0300-8698576
        </div>
    </body>
    </html>
    `;
}

// ============================================
// 🎨 TEMPLATE 10: 🏢 HASSAN DISTRIBUTOR CORPORATE FMCG & TAX INVOICE [101067]
// 100% Authentic Match to FMCG Enterprise Reference Photo (Sample 5)
// Features:
// 1. Distributor Header [101067], KLP Road Sadiqabad, NTN / STRN, Customer M/S with NTN/STRN & Phone
// 2. Exact 11-field Meta Box (Invoice No, Order/Deliv Date, Booker/Salesman, OB User Tag, Route, Channel, Sub Channel, NIC, IT Status, Last Month Sales, Month to Date Sales)
// 3. Multi-Category Grouping (Biscuit, Cake, Confectionery, etc.) with Category Subtotals
// 4. Complete 12-Column Table: Product Code/Description, CTN Size, Sale Qty [CTN, Box, Pcs], Retail Price, Trade Price, Gross Amount, Trade Offer [Free Qty, Amount], Disc, Tax 18%, Further Tax, Advance Tax, Net Amount
// 5. Table Summary Row: Total SKU(s), Grand Total CTN/Qty, Gross, Disc, Tax 18%, Adv Tax, Net Amount
// 6. Lower Split: Load Form #, Promotions Applied Breakdown, Net Amount, SDR Amount, Net Payable, Store Credit Balance & Shop Keeper Signature Stamp
// ============================================
function template10HassanDistributor(bill, agency, customer, settings) {
    const s = settings || (window.ebPrintEngine ? window.ebPrintEngine.getEffectivePrintSettings(agency) : {});
    const tot = getTemplateTotals(bill);
    const b = bill || {};

    // Helper for date formatting e.g. 21-09-2026-Mon
    function formatFmcgDate(d, defaultOffsetDays = 0) {
        let dt;
        if (!d) {
            dt = new Date();
            if (defaultOffsetDays) dt.setDate(dt.getDate() + defaultOffsetDays);
        } else {
            dt = new Date(d);
            if (isNaN(dt.getTime())) return String(d);
        }
        const dd = String(dt.getDate()).padStart(2, '0');
        const mm = String(dt.getMonth() + 1).padStart(2, '0');
        const yy = dt.getFullYear();
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return `${dd}-${mm}-${yy}-${days[dt.getDay()]}`;
    }

    const orderDateStr = formatFmcgDate(b.date || b.invoiceDate || b.createdAt);
    const deliveryDateStr = formatFmcgDate(b.deliveryDate, 1);
    const billNo = b.billNo || 'D0725INV105183';
    const bookerSalesman = (b.bookerName || b.salesmanName || agency.ownerName || 'Bilawal') + ' / ' + (b.salesmanName ? b.salesmanName.slice(0, 2) : 'M.');
    const obUserTag = b.obUserTag || 'Full Range';
    const routeName = b.route || b.customerRoute || customer.route || 'AHMAD PUR LAMAH-ONCE-MONDAY-2';
    const channelName = (b.channel || (customer.customerType === 'wholesale' ? 'WHOLESALE' : 'RETAIL')).toUpperCase();
    const subChannelName = (b.subChannel || 'KIRYANA STORE').toUpperCase();
    const customerNic = b.custNic || customer.cnic || '3130468337169';
    const itStatus = b.itStatus || (customer.isFiler ? 'Filer-0%' : 'Non-Filer-2.5%');
    const lastMonthSales = b.lastMonthSales !== undefined ? parseFloat(b.lastMonthSales).toLocaleString('en-US', {minimumFractionDigits: 2}) : '5,755.78';
    const mtdSales = b.mtdSales !== undefined ? parseFloat(b.mtdSales).toLocaleString('en-US', {minimumFractionDigits: 2}) : '7,024.14';
    const loadFormNo = b.loadFormNo || ('D0725LF' + (billNo ? String(billNo).slice(-4) : '4187'));
    const sdrAmount = parseFloat(b.sdrAmount || 0);

    const distCode = agency.terminalId || agency.distributorCode || '101067';
    const distName = (agency.name || 'HASSAN DISTRIBUTOR').toUpperCase();
    const distAddress = agency.address || 'New Bus Stand, Opposite New Auto Market, KLP Road Sadiq Abad';
    const distPhone = agency.mobile || agency.phone || '03006714051';
    const distNtn = agency.ntn || '5569263-0';
    const distStrn = agency.strn || '3277876163588';

    const custCode = customer.code ? customer.code : (customer.id ? ('M' + String(customer.id).slice(-11).padStart(11, '0')) : 'M00000308883');
    const custDisplayName = (customer.shopName ? customer.shopName : customer.name || 'TAJ K S').toUpperCase();
    const custNtn = customer.ntn || '';
    const custStrn = customer.strn || '';
    const custAddress = (customer.address || customer.area || 'TAJ CHOWK').toUpperCase();
    const custPhone = customer.mobile || customer.phone || '3146800950';

    // Store Credit Balance (Running Khata)
    const storeCreditBalance = b.storeCreditBalance !== undefined 
        ? parseFloat(b.storeCreditBalance) 
        : (parseFloat(tot.balance) > 0 ? parseFloat(tot.balance) : parseFloat(tot.grandTotal));

    // Process Items and Category Grouping
    const items = Array.isArray(b.items) && b.items.length > 0 ? b.items : [
        {
            name: "1619 SOOPER",
            sku: "1619",
            category: "Biscuit",
            ctnSize: 216,
            box: 1,
            ctn: null,
            pcs: null,
            retailPrice: 305.08,
            rate: 295.45,
            gross: 295.45,
            freeQty: null,
            freeAmount: null,
            disc: 21.54,
            tax18: 54.92,
            furtherTax: 0,
            advTax: 8.22,
            net: 337.05
        },
        {
            name: "30001620 SOOPER CLASSIC MP INVXI REV1",
            sku: "30001620",
            category: "Biscuit",
            ctnSize: 288,
            box: 2,
            ctn: null,
            pcs: null,
            retailPrice: 271.19,
            rate: 262.88,
            gross: 525.76,
            freeQty: null,
            freeAmount: null,
            disc: 38.80,
            tax18: 97.63,
            furtherTax: 0,
            advTax: 14.61,
            net: 599.19
        },
        {
            name: "30002123 Sooper Classic HR INV XIV",
            sku: "30002123",
            category: "Biscuit",
            ctnSize: 144,
            box: 2,
            ctn: null,
            pcs: null,
            retailPrice: 338.98,
            rate: 328.20,
            gross: 656.40,
            freeQty: null,
            freeAmount: null,
            disc: 47.71,
            tax18: 122.03,
            furtherTax: 0,
            advTax: 18.27,
            net: 749.00
        },
        {
            name: "31000430 CAKE UP STRAWBERRY RS. 30 INV XIV",
            sku: "31000430",
            category: "Cake",
            ctnSize: 288,
            box: 1,
            ctn: null,
            pcs: null,
            retailPrice: 0.00,
            rate: 271.29,
            gross: 271.29,
            freeQty: null,
            freeAmount: null,
            disc: 8.03,
            tax18: 47.39,
            furtherTax: 0,
            advTax: 10.53,
            net: 329.20
        },
        {
            name: "31000429 GLUCO TEDDY CHOC. FILLING RS. 50 INV XIV",
            sku: "31000429",
            category: "Cake",
            ctnSize: 144,
            box: 1,
            ctn: null,
            pcs: null,
            retailPrice: 0.00,
            rate: 302.54,
            gross: 302.54,
            freeQty: null,
            freeAmount: null,
            disc: 8.96,
            tax18: 52.84,
            furtherTax: 0,
            advTax: 11.74,
            net: 367.12
        },
        {
            name: "31000437 SOOPER SOFT BAKES PLAIN CAKE RS. 40 INV XIV",
            sku: "31000437",
            category: "Cake",
            ctnSize: 144,
            box: 1,
            ctn: null,
            pcs: null,
            retailPrice: 0.00,
            rate: 363.26,
            gross: 363.26,
            freeQty: null,
            freeAmount: null,
            disc: 10.75,
            tax18: 63.45,
            furtherTax: 0,
            advTax: 14.10,
            net: 440.82
        }
    ];

    // Group items by category
    const catGroups = {};
    let grandSkuCount = 0;
    let grandTotalQty = 0;
    let grandGross = 0;
    let grandDisc = 0;
    let grandTax18 = 0;
    let grandFurtherTax = 0;
    let grandAdvTax = 0;
    let grandGstFree = 0;
    let grandNet = 0;

    items.forEach((it, idx) => {
        const cat = (it.category || 'General').trim();
        if (!catGroups[cat]) catGroups[cat] = [];
        catGroups[cat].push(it);
    });

    let tableRowsHTML = '';
    const promoItems = [];

    Object.keys(catGroups).forEach(catName => {
        const groupItems = catGroups[catName];
        let catQty = 0;
        let catGross = 0;
        let catDisc = 0;
        let catTax18 = 0;
        let catFurtherTax = 0;
        let catAdvTax = 0;
        let catGstFree = 0;
        let catNet = 0;

        // Category Header Row (16 columns)
        tableRowsHTML += `
        <tr class="fmcg-cat-hdr">
            <td colspan="16" class="cat-title"><b>${catName}</b></td>
        </tr>`;

        groupItems.forEach((it) => {
            grandSkuCount++;
            const sku = it.sku || it.skuCode || it.barcode || ('SKU' + String(grandSkuCount).padStart(4, '0'));
            const ctnSize = it.ctnSize || it.packing || 144;
            const ctnQty = (it.ctn !== undefined && it.ctn !== null && it.ctn !== '') ? it.ctn : '-';
            const boxQty = it.box !== undefined && it.box !== null && it.box !== '' ? it.box : (it.qty || 1);
            const pcsQty = (it.pcs !== undefined && it.pcs !== null && it.pcs !== '') ? it.pcs : '-';
            
            const numBox = parseFloat(boxQty) || 0;
            const numCtn = parseFloat(ctnQty) || 0;
            const numPcs = parseFloat(pcsQty) || 0;
            const rowUnitCount = numBox + (numCtn > 0 ? numCtn : 0) + (numPcs > 0 ? numPcs : 0);
            catQty += rowUnitCount;
            grandTotalQty += rowUnitCount;

            const retailPrice = parseFloat(it.retailPrice !== undefined ? it.retailPrice : (it.retailRate || 0));
            const tradePrice = parseFloat(it.tradePrice !== undefined ? it.tradePrice : (it.rate || it.tp || 0));
            const gross = parseFloat(it.gross !== undefined ? it.gross : (numBox > 0 ? (numBox * tradePrice) : (tradePrice * (parseFloat(it.qty) || 1))));
            catGross += gross;
            grandGross += gross;

            const freeQty = (it.freeQty !== undefined && it.freeQty !== null && it.freeQty !== '') ? it.freeQty : (it.bonus || '-');
            const freeAmount = (it.freeAmount !== undefined && it.freeAmount !== null && it.freeAmount !== '') ? parseFloat(it.freeAmount).toFixed(2) : '-';

            // Discount
            const discVal = parseFloat(it.disc !== undefined ? it.disc : (it.discount || it.td || 0));
            catDisc += discVal;
            grandDisc += discVal;

            if (discVal > 0) {
                promoItems.push({
                    name: `${(it.promoDesc || it.name.replace(/RS\..*$/i, '')).trim()} (${discVal.toFixed(2)})`,
                    amount: discVal
                });
            }

            // Taxes
            const tax18 = parseFloat(it.tax18 !== undefined ? it.tax18 : (it.taxAmount || ((gross - discVal) * 0.18)));
            catTax18 += tax18;
            grandTax18 += tax18;

            const furtherTax = parseFloat(it.furtherTax || 0);
            catFurtherTax += furtherTax;
            grandFurtherTax += furtherTax;

            const advTax = parseFloat(it.advTax !== undefined ? it.advTax : (customer.isFiler ? 0 : ((gross - discVal) * 0.025)));
            catAdvTax += advTax;
            grandAdvTax += advTax;

            const gstFree = parseFloat(it.gstFree || 0);
            catGstFree += gstFree;
            grandGstFree += gstFree;

            const net = parseFloat(it.net !== undefined ? it.net : (gross - discVal + tax18 + furtherTax + advTax));
            catNet += net;
            grandNet += net;

            tableRowsHTML += `
            <tr class="fmcg-item-row">
                <td class="col-desc">
                    <span class="p-sku">${sku}</span> 
                    <span class="p-name">${it.name}</span>
                </td>
                <td class="col-center">${ctnSize}</td>
                <td class="col-center">${ctnQty}</td>
                <td class="col-center font-bold">${boxQty}</td>
                <td class="col-center">${pcsQty}</td>
                <td class="col-right">${retailPrice > 0 ? retailPrice.toFixed(2) : '0.00'}</td>
                <td class="col-right">${tradePrice.toFixed(2)}</td>
                <td class="col-right font-bold">${gross.toFixed(2)}</td>
                <td class="col-center">${freeQty}</td>
                <td class="col-right">${freeAmount}</td>
                <td class="col-right font-bold">${discVal > 0 ? discVal.toFixed(2) : '-'}</td>
                <td class="col-right">${tax18.toFixed(2)}</td>
                <td class="col-right">${furtherTax > 0 ? furtherTax.toFixed(2) : '0.00'}</td>
                <td class="col-right">${advTax.toFixed(2)}</td>
                <td class="col-center">${gstFree > 0 ? gstFree.toFixed(2) : '-'}</td>
                <td class="col-right col-net font-bold">${net.toFixed(2)}</td>
            </tr>`;
        });

        // Category Subtotal Row (16 columns)
        tableRowsHTML += `
        <tr class="fmcg-cat-subtotal">
            <td class="font-bold">${catName} Total</td>
            <td class="col-center">-</td>
            <td class="col-center">-</td>
            <td class="col-center font-bold">${catQty}</td>
            <td class="col-center">-</td>
            <td class="col-right">-</td>
            <td class="col-right">-</td>
            <td class="col-right font-bold">${catGross.toFixed(2)}</td>
            <td class="col-center">-</td>
            <td class="col-right">-</td>
            <td class="col-right font-bold">${catDisc > 0 ? catDisc.toFixed(2) : '-'}</td>
            <td class="col-right font-bold">${catTax18.toFixed(2)}</td>
            <td class="col-right font-bold">${catFurtherTax > 0 ? catFurtherTax.toFixed(2) : '0.00'}</td>
            <td class="col-right font-bold">${catAdvTax.toFixed(2)}</td>
            <td class="col-center font-bold">${catGstFree > 0 ? catGstFree.toFixed(2) : '-'}</td>
            <td class="col-right font-bold col-net">${Math.round(catNet).toLocaleString()}</td>
        </tr>`;
    });

    // Promotions Applied HTML
    let promoHTML = '';
    if (promoItems.length > 0) {
        promoHTML = promoItems.map((p, idx) => {
            const letter = String.fromCharCode(97 + (idx % 26));
            return `
            <tr>
                <td class="promo-name">(${letter}) ${p.name}</td>
                <td class="promo-amt">${p.amount.toFixed(2)}</td>
            </tr>`;
        }).join('');
    } else {
        promoHTML = `
        <tr>
            <td class="promo-name">(a) RTGR10_DT_Disc_INVXI_SP_MP_7.2908%</td>
            <td class="promo-amt">21.54</td>
        </tr>
        <tr>
            <td class="promo-name">(b) RTGR8_DT_Disc_INVXI_SP_HR_7.3806%</td>
            <td class="promo-amt">38.80</td>
        </tr>
        <tr>
            <td class="promo-name">RT_DT_Disc_ALL-SKUS-INV-14_HR_7.2683%</td>
            <td class="promo-amt">47.71</td>
        </tr>
        <tr>
            <td class="promo-name">RT DT Disc-All-SKUS-Cakes-INV14_2.96%</td>
            <td class="promo-amt">27.74</td>
        </tr>`;
    }

    const netInvoiceRound = Math.round(grandNet);
    const netPayable = Math.max(0, netInvoiceRound - sdrAmount);
    const livePrintDateTime = new Date().toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric'
    }) + ' ' + new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="utf-8">
        <title>Invoice ${billNo} — ${distName}</title>
        <style>
            @media print {
                @page {
                    size: A4 portrait;
                    margin: 5mm 6mm;
                }
                body {
                    margin: 0;
                    padding: 0;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                .no-print { display: none !important; }
            }

            * { box-sizing: border-box; }
            body {
                font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
                font-size: 9px;
                color: #000;
                background: #fff;
                margin: 0 auto;
                padding: 4px 6px;
                max-width: 860px;
                line-height: 1.2;
            }

            .font-bold { font-weight: bold; }
            .col-center { text-align: center; }
            .col-right { text-align: right; }

            /* 🏢 TOP HEADER */
            .fmcg-top-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 5px;
            }
            .fmcg-top-left {
                width: 52%;
                line-height: 1.3;
            }
            .fmcg-top-center {
                width: 14%;
                text-align: center;
            }
            .fmcg-top-right {
                width: 34%;
            }

            .h-dist-title {
                font-size: 15px;
                font-weight: 900;
                letter-spacing: 0.3px;
                color: #000;
                margin-bottom: 2px;
            }
            .h-dist-text {
                font-size: 8.5px;
                color: #111;
            }
            .h-cust-name {
                font-size: 11px;
                font-weight: 800;
                margin-top: 4px;
                color: #000;
            }

            .h-doc-title {
                font-size: 20px;
                font-weight: 900;
                letter-spacing: 0.5px;
                text-transform: capitalize;
                margin-top: 4px;
            }

            /* 📋 META TABLE BOX (Right side) */
            .fmcg-meta-box {
                width: 100%;
                border-collapse: collapse;
                border: 1px solid #000;
                font-size: 8px;
            }
            .fmcg-meta-box td {
                padding: 1.5px 4px;
                vertical-align: middle;
            }
            .m-lbl {
                font-weight: bold;
                white-space: nowrap;
                width: 44%;
                border-right: 1px solid #000;
            }
            .m-val {
                width: 56%;
                font-weight: 600;
            }
            .fmcg-meta-box tr {
                border-bottom: 0.5px solid #000;
            }
            .fmcg-meta-box tr:last-child {
                border-bottom: none;
            }

            /* 📦 16-COLUMN PRODUCTS TABLE */
            .fmcg-table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 4px;
                margin-bottom: 6px;
            }
            .fmcg-table th, .fmcg-table td {
                border: 0.75px solid #000;
                padding: 2px 2.5px;
                font-size: 8px;
            }
            .fmcg-table th {
                background: #fff;
                font-weight: bold;
                text-align: center;
                line-height: 1.15;
            }
            .fmcg-table th.sub-th {
                font-size: 7.5px;
                padding: 1.5px 2px;
            }
            .fmcg-cat-hdr td {
                background: #f8fafc;
                font-size: 9.5px;
                font-weight: 900;
                padding: 3px 5px;
                text-align: left;
                border-top: 1px solid #000;
                border-bottom: 1px solid #000;
            }
            .fmcg-item-row td {
                line-height: 1.2;
            }
            .p-sku {
                font-weight: bold;
                font-size: 7.5px;
                color: #222;
                margin-right: 3px;
            }
            .p-name {
                font-weight: 700;
            }
            .col-desc {
                max-width: 170px;
                word-wrap: break-word;
            }
            .fmcg-cat-subtotal td {
                background: #fff;
                font-weight: bold;
                border-top: 1px solid #000;
                border-bottom: 1px solid #000;
                padding: 2px 2.5px;
            }
            .fmcg-grand-total td {
                background: #f1f5f9;
                font-weight: 900;
                font-size: 8.5px;
                border-top: 1.5px solid #000;
                border-bottom: 1.5px solid #000;
                padding: 3px 2.5px;
            }
            .col-net {
                font-size: 8.5px;
            }

            /* 📊 LOWER SECTION (PROMOTIONS + TOTALS) */
            .fmcg-lower {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                gap: 12px;
                margin-top: 4px;
            }
            .fmcg-lower-left {
                width: 54%;
            }
            .fmcg-lower-right {
                width: 44%;
            }

            .fmcg-promo-table {
                width: 100%;
                border-collapse: collapse;
                border: 1px solid #000;
                font-size: 8px;
            }
            .fmcg-promo-table th, .fmcg-promo-table td {
                border: 0.75px solid #000;
                padding: 2px 5px;
            }
            .fmcg-promo-table th {
                background: #fff;
                font-weight: bold;
            }
            .promo-hdr-main {
                text-align: center;
                font-size: 9px;
            }
            .promo-name {
                font-size: 7.5px;
            }
            .promo-amt {
                text-align: right;
                font-weight: bold;
            }
            .promo-total td {
                font-weight: bold;
                background: #f8fafc;
            }
            .load-form-tag {
                font-size: 9px;
                font-weight: 800;
                margin-top: 6px;
                color: #000;
            }

            /* FINANCIAL SUMMARY (RIGHT) */
            .fmcg-calc-box {
                width: 100%;
                border-collapse: collapse;
                border: 1px solid #000;
                font-size: 8.5px;
            }
            .fmcg-calc-box td {
                border: 0.75px solid #000;
                padding: 3px 6px;
            }
            .c-lbl {
                font-weight: bold;
                text-align: right;
                width: 58%;
            }
            .c-val {
                font-weight: 800;
                text-align: right;
                width: 42%;
            }
            .row-net-pay {
                background: #f1f5f9;
                font-weight: 900;
                font-size: 9.5px;
            }

            /* ✍️ SIGNATURES & AUTHENTIC URDU STAMP */
            .fmcg-sig-wrap {
                margin-top: 10px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .fmcg-stamp-box {
                border: 2px dashed #1e40af;
                color: #1e40af;
                padding: 3px 8px;
                border-radius: 8px;
                text-align: center;
                transform: rotate(-3deg);
                background: rgba(30, 64, 175, 0.04);
                display: inline-block;
                max-width: 170px;
            }
            .stamp-line-urdu {
                font-size: 11px;
                font-weight: 900;
            }
            .stamp-line-date {
                font-size: 10px;
                font-weight: 900;
                letter-spacing: 0.5px;
                color: #dc2626;
                margin: 1px 0;
            }
            .stamp-line-sub {
                font-size: 7.5px;
                font-weight: 700;
            }
            .fmcg-sig-box {
                width: 140px;
                text-align: center;
            }
            .fmcg-sig-line {
                border-bottom: 1px solid #000;
                margin-bottom: 3px;
                height: 22px;
            }
            .fmcg-sig-lbl {
                font-size: 9px;
                font-weight: bold;
            }

            /* FOOTER */
            .fmcg-footer {
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 8px;
                color: #444;
                margin-top: 10px;
                border-top: 0.5px solid #ccc;
                padding-top: 3px;
            }
        </style>
    </head>
    <body>
        <!-- 🏢 TOP HEADER -->
        <div class="fmcg-top-header">
            <!-- Left: Distributor & Customer Details -->
            <div class="fmcg-top-left">
                <div class="h-dist-title">${distName} [ ${distCode} ]</div>
                <div class="h-dist-text">${distAddress} / ${distPhone}</div>
                <div class="h-dist-text font-bold">N.T.N - ${distNtn} / STRN - ${distStrn}</div>
                <div class="h-cust-name">${custCode} - M/S - ${custDisplayName}</div>
                <div class="h-dist-text">NTN - ${custNtn} / STRN - ${custStrn}</div>
                <div class="h-dist-text font-bold">${custAddress} / ${custPhone}</div>
            </div>

            <!-- Center: Document Title -->
            <div class="fmcg-top-center">
                <div class="h-doc-title">Invoice</div>
            </div>

            <!-- Right: Exact 11-field Metadata Table -->
            <div class="fmcg-top-right">
                <table class="fmcg-meta-box">
                    <tr>
                        <td class="m-lbl">Invoice No :</td>
                        <td class="m-val">${billNo}</td>
                    </tr>
                    <tr>
                        <td class="m-lbl">Order / Deliv.Date :</td>
                        <td class="m-val">${orderDateStr} / ${deliveryDateStr}</td>
                    </tr>
                    <tr>
                        <td class="m-lbl">Booker / Salesman :</td>
                        <td class="m-val">${bookerSalesman}</td>
                    </tr>
                    <tr>
                        <td class="m-lbl">OB User Tag :</td>
                        <td class="m-val">${obUserTag}</td>
                    </tr>
                    <tr>
                        <td class="m-lbl">Route :</td>
                        <td class="m-val">${routeName}</td>
                    </tr>
                    <tr>
                        <td class="m-lbl">Channel :</td>
                        <td class="m-val">${channelName}</td>
                    </tr>
                    <tr>
                        <td class="m-lbl">Sub Channel :</td>
                        <td class="m-val">${subChannelName}</td>
                    </tr>
                    <tr>
                        <td class="m-lbl">NIC :</td>
                        <td class="m-val">${customerNic}</td>
                    </tr>
                    <tr>
                        <td class="m-lbl">I.T Status :</td>
                        <td class="m-val">${itStatus}</td>
                    </tr>
                    <tr>
                        <td class="m-lbl">Last Month Sales (PKR) :</td>
                        <td class="m-val">${lastMonthSales}</td>
                    </tr>
                    <tr>
                        <td class="m-lbl">Month To Date Sales (PKR) :</td>
                        <td class="m-val">${mtdSales}</td>
                    </tr>
                </table>
            </div>
        </div>

        <!-- 📦 16-COLUMN PRODUCTS TABLE WITH CATEGORY GROUPING -->
        <table class="fmcg-table">
            <thead>
                <tr>
                    <th rowspan="2" style="width: 23%;">Product Code / Description</th>
                    <th rowspan="2" style="width: 4%;">CTN Size</th>
                    <th colspan="3" style="width: 10%;">Sale Qty</th>
                    <th rowspan="2" style="width: 6%;">Retail Price</th>
                    <th rowspan="2" style="width: 6%;">Trade Price</th>
                    <th rowspan="2" style="width: 7%;">Gross Amount</th>
                    <th colspan="2" style="width: 8%;">Trade Offer</th>
                    <th rowspan="2" style="width: 5%;">Disc</th>
                    <th rowspan="2" style="width: 6%;">Tax Applicable 18%</th>
                    <th rowspan="2" style="width: 5%;">Further Tax</th>
                    <th rowspan="2" style="width: 5%;">Advance Tax</th>
                    <th rowspan="2" style="width: 6%;">Gst For Free</th>
                    <th rowspan="2" style="width: 9%;">Net Amount</th>
                </tr>
                <tr>
                    <th class="sub-th">CTN</th>
                    <th class="sub-th">Box</th>
                    <th class="sub-th">Pcs</th>
                    <th class="sub-th">Qty</th>
                    <th class="sub-th">Free Amount</th>
                </tr>
            </thead>
            <tbody>
                ${tableRowsHTML}
                <!-- 📊 SUMMARY ROW -->
                <tr class="fmcg-grand-total">
                    <td class="font-bold">Total SKU(s): ${grandSkuCount}</td>
                    <td class="col-center">-</td>
                    <td class="col-center font-bold" colspan="3">Grand Total: ${grandTotalQty}</td>
                    <td class="col-center">-</td>
                    <td class="col-center">-</td>
                    <td class="col-right font-bold">${grandGross.toFixed(2)}</td>
                    <td class="col-center">-</td>
                    <td class="col-right">-</td>
                    <td class="col-right font-bold">${grandDisc > 0 ? grandDisc.toFixed(2) : '-'}</td>
                    <td class="col-right font-bold">${grandTax18.toFixed(2)}</td>
                    <td class="col-right font-bold">${grandFurtherTax > 0 ? grandFurtherTax.toFixed(2) : '0.00'}</td>
                    <td class="col-right font-bold">${grandAdvTax.toFixed(2)}</td>
                    <td class="col-center font-bold">${grandGstFree > 0 ? grandGstFree.toFixed(2) : 'Free: 0.00'}</td>
                    <td class="col-right font-bold col-net">${netInvoiceRound.toLocaleString()}</td>
                </tr>
            </tbody>
        </table>

        <!-- 📊 LOWER SECTION (PROMOTIONS APPLIED + FINANCIAL TOTALS) -->
        <div class="fmcg-lower">
            <!-- Left: Promotions Table & Load Form -->
            <div class="fmcg-lower-left">
                <table class="fmcg-promo-table">
                    <thead>
                        <tr>
                            <th colspan="2" class="promo-hdr-main">Promotions Applied</th>
                        </tr>
                        <tr>
                            <th style="width: 76%; text-align: left;">Discount</th>
                            <th style="width: 24%; text-align: right;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${promoHTML}
                        <tr class="promo-total">
                            <td class="font-bold">Total Discount</td>
                            <td class="promo-amt">${grandDisc.toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>
                <div class="load-form-tag">Load Form # ${loadFormNo}</div>
            </div>

            <!-- Right: Calculation Box -->
            <div class="fmcg-lower-right">
                <table class="fmcg-calc-box">
                    <tr>
                        <td class="c-lbl">Net Amount:</td>
                        <td class="c-val">${netInvoiceRound.toLocaleString()}</td>
                    </tr>
                    <tr>
                        <td class="c-lbl">SDR Amount:</td>
                        <td class="c-val">${sdrAmount.toFixed(2)}</td>
                    </tr>
                    <tr class="row-net-pay">
                        <td class="c-lbl">Net Payable:</td>
                        <td class="c-val font-bold">${netPayable.toLocaleString()}</td>
                    </tr>
                    <tr>
                        <td class="c-lbl">Store Credit Balance:</td>
                        <td class="c-val font-bold">${storeCreditBalance.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    </tr>
                </table>

                <!-- Signature & Stamp Box -->
                <div class="fmcg-sig-wrap">
                    <div class="fmcg-stamp-box">
                        <div class="stamp-line-urdu">${custDisplayName || 'تاج کریانہ سٹور'}</div>
                        <div class="stamp-line-date">${orderDateStr.split('-').slice(0, 3).join(' ')}</div>
                        <div class="stamp-line-sub">پروپرائیٹر / دستخط تصدیق شدہ</div>
                    </div>
                    <div class="fmcg-sig-box">
                        <div class="fmcg-sig-line"></div>
                        <div class="fmcg-sig-lbl">Shop Keeper</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 🖨️ FOOTER STATUS -->
        <div class="fmcg-footer">
            <span>Page 1 Of 1</span>
            <span>Printed: ${livePrintDateTime}</span>
        </div>
    </body>
    </html>
    `;
}

// ============================================
// 🎨 TEMPLATE 11: 📦 AL RAHEEM AGENCIES FMCG CASH MEMO / INVOICE (PHASE 4)
// Recreated with 100% fidelity from Reference Photos (Cookania & Giggly FMCG Range)
// Features: 2-Column Meta Table (PJP, Store Code, Order & Deliv Dates, Channel), 
// 10-Column Items Table (SKU, CTN, Box, Free Units, TP, Gross, Discount, Net, NP Per Box),
// Lower Section: Promotions Applied table, Load Form #, Financial Summary, 3 Signature boxes & Urdu Note Stamp
// ============================================
function template11AlRaheemCashMemo(bill, agency, customer, settings) {
    return template7FMCGDistribution(bill, agency, customer, settings);
}

// ============================================
// 🎯 TEMPLATE REGISTRY (Naam → Function!)
// ============================================
const BILL_TEMPLATES = {
    'template11': { name: '📦 Al-Raheem Agencies Cash Memo/Invoice (Phase 4 — FMCG Distribution)', fn: template11AlRaheemCashMemo },
    'template10': { name: '🏢 Hassan Distributor Corporate FMCG & Tax Invoice [101067] (Phase 5 — Complete)', fn: template10HassanDistributor },
    'template9': { name: '🇵🇰 Abid Traders Sales Invoice — Manthar Road Sadiqabad (Phase 6 — Complete)', fn: template9AbidTraders },
    'template8': { name: '🇵🇰 Classic Wholesale Urdu Grid (Legal Half-Cut)', fn: template8WholesaleUrduGrid },
    'template7': { name: '📦 FMCG Corporate Cash Memo/Invoice (Al-Raheem Format)', fn: template7FMCGDistribution },
    'template4': { name: '⚡ Modern Minimal / Table Invoice', fn: template4Modern },
    'template1': { name: '🇵🇰 Urdu Classic (Nastaliq)', fn: template1Urdu },
    'template2': { name: '📋 Traders English (Header)', fn: template2Traders },
    'template3': { name: '🇵🇰 Urdu + English Mix', fn: template3Mix },
    'template5': { name: '💎 Premium Full (All Boxes)', fn: template5Premium },
    'template6': { name: '🧾 Thermal Slip (58/80mm POS)', fn: template6Thermal }
};

const DEFAULT_TEMPLATE = 'template4';

// ============================================
// 🎯 MAIN RENDERER & EXPORT TO WINDOW
// ============================================
function buildBillHTML(bill, templateId, customSettings) {
    if (!bill) return '';
    const agRaw = (typeof myAgency !== 'undefined' && myAgency) ? myAgency : (bill.agency || {});
    const agency = getTemplateAgency(agRaw, bill);
    const customer = getTemplateCustomer(bill);
    const tId = templateId || agency.defaultTemplate || agency.template || DEFAULT_TEMPLATE;
    const template = BILL_TEMPLATES[tId] || BILL_TEMPLATES[DEFAULT_TEMPLATE] || BILL_TEMPLATES['template4'];
    
    // Read checkbox controls if print engine loaded
    const settings = customSettings || ((window.ebPrintEngine && window.ebPrintEngine.getEffectivePrintSettings)
        ? window.ebPrintEngine.getEffectivePrintSettings(agRaw)
        : (typeof DEFAULT_PRINT_SETTINGS !== 'undefined' ? DEFAULT_PRINT_SETTINGS : {}));

    return template.fn(bill, agency, customer, settings);
}

// Attach globally
window.buildBillHTML = buildBillHTML;
window.renderBillTemplate = buildBillHTML;
window.BILL_TEMPLATES = BILL_TEMPLATES;