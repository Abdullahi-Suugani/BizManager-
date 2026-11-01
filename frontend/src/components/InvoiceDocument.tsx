import { createPortal } from "react-dom";

export type InvoiceDocumentItem = {
  itemName: string;
  quantity: number | string;
  unitPrice: number | string;
  amount?: number | string;
};

export type InvoiceDocumentData = {
  transactionNumber: string;
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  paymentMethod: string;
  date: string;
  items: InvoiceDocumentItem[];
  subtotal: number;
  total: number;
  amountPaid: number;
  remaining: number;
  logoData: string | null;
  showBusinessLogo: boolean;
};

const money = (value: number | string) => `$${Number(value).toFixed(2)}`;

export function InvoiceDocument({ invoice }: { invoice: InvoiceDocumentData }) {
  return (
    <article className="invoice-document">
      <header className="invoice-title-row">
        <div>
          <h1>INVOICE</h1>
          <span className="invoice-title-underline" />
        </div>
        <p>Invoice No: <strong>{invoice.transactionNumber}</strong></p>
      </header>

      <section className="invoice-customer-info">
        <div className="invoice-billed-to">
          <h2>Billed To</h2>
          <p>{invoice.customerName || "—"}</p>
          <p>{invoice.customerAddress || "—"}</p>
          <p>{invoice.customerPhone || "—"}</p>
        </div>
        <div className="invoice-meta">
          <p><strong>Date:</strong><span>{invoice.date}</span></p>
          <p><strong>Payment Method:</strong><span className="invoice-payment-method">{invoice.paymentMethod}</span></p>
          {invoice.showBusinessLogo && invoice.logoData ? (
            <img className="invoice-logo" src={invoice.logoData} alt="Business logo" />
          ) : null}
        </div>
      </section>

      <div className="invoice-items-wrap">
        <table className="invoice-items-table">
          <thead>
            <tr>
              <th className="invoice-number-column">#</th>
              <th>Item Name</th>
              <th className="invoice-quantity-column">Qty.</th>
              <th className="invoice-money-column">Price</th>
              <th className="invoice-money-column">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, index) => (
              <tr key={`${item.itemName}-${index}`}>
                <td>{index + 1}</td>
                <td className="invoice-item-name">{item.itemName}</td>
                <td className="invoice-quantity-column">{item.quantity}</td>
                <td className="invoice-money-column">{money(item.unitPrice)}</td>
                <td className="invoice-money-column">{money(item.amount ?? Number(item.quantity) * Number(item.unitPrice))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="invoice-payment-summary" aria-label="Payment summary">
        <div className="invoice-summary-row">
          <span>Subtotal</span>
          <span>{money(invoice.subtotal)}</span>
        </div>
        <div className="invoice-summary-row invoice-total-row">
          <strong>Total</strong>
          <strong>{money(invoice.total)}</strong>
        </div>
        <div className="invoice-summary-row">
          <span>Paid</span>
          <span>{money(invoice.amountPaid)}</span>
        </div>
        <div className="invoice-summary-row invoice-balance-row">
          <strong>Remaining Balance</strong>
          <strong>{money(invoice.remaining)}</strong>
        </div>
      </section>

      <footer className="invoice-thank-you">
        <h2>Thank You!</h2>
        <p>We appreciate your business.</p>
      </footer>
    </article>
  );
}

export function InvoicePrintHost({ invoice }: { invoice: InvoiceDocumentData }) {
  return createPortal(
    <div className="invoice-print-host">
      <InvoiceDocument invoice={invoice} />
    </div>,
    document.body
  );
}
