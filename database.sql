-- ==========================================================
-- SolarPulse EPC ERP & CRM - Complete Production MySQL Database Dump
-- Generated for Direct Production Server & phpMyAdmin Deployment
-- Engine: InnoDB | Charset: utf8mb4 | Collation: utf8mb4_unicode_ci
-- ==========================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

-- --------------------------------------------------------
-- Table structure for table `solar_users`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `solar_users` (
  `id` VARCHAR(64) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(191) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL DEFAULT '123456',
  `role` VARCHAR(64) NOT NULL DEFAULT 'Super Admin',
  `phone` VARCHAR(32) DEFAULT '',
  `department` VARCHAR(64) DEFAULT 'Operations',
  `designation` VARCHAR(128) DEFAULT '',
  `employee_id` VARCHAR(64) DEFAULT NULL,
  `customer_id` VARCHAR(64) DEFAULT NULL,
  `avatar` TEXT,
  `is_field_worker` TINYINT(1) DEFAULT 0,
  `status` VARCHAR(32) DEFAULT 'ACTIVE',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_role` (`role`),
  INDEX `idx_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `solar_customers`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `solar_customers` (
  `id` VARCHAR(64) PRIMARY KEY,
  `customer_code` VARCHAR(32) NOT NULL UNIQUE,
  `name` VARCHAR(255) NOT NULL,
  `company_name` VARCHAR(255) DEFAULT '',
  `customer_type` VARCHAR(32) DEFAULT 'Residential',
  `phone` VARCHAR(32) NOT NULL,
  `email` VARCHAR(191) DEFAULT '',
  `password` VARCHAR(255) NOT NULL DEFAULT '123456',
  `site_address` TEXT NOT NULL,
  `city` VARCHAR(128) NOT NULL,
  `state` VARCHAR(128) DEFAULT 'Gujarat',
  `pincode` VARCHAR(16) DEFAULT '',
  `gst_number` VARCHAR(32) DEFAULT '',
  `electricity_consumer_no` VARCHAR(64) DEFAULT '',
  `sanctioned_load_kw` DECIMAL(10,2) DEFAULT 0.00,
  `status` VARCHAR(32) DEFAULT 'ACTIVE',
  `active_project_id` VARCHAR(64) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_customers_status` (`status`),
  INDEX `idx_customers_phone` (`phone`),
  INDEX `idx_customers_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `solar_leads`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `solar_leads` (
  `id` VARCHAR(64) PRIMARY KEY,
  `customer_name` VARCHAR(255) NOT NULL,
  `company_name` VARCHAR(255) DEFAULT '',
  `phone` VARCHAR(32) NOT NULL,
  `email` VARCHAR(191) DEFAULT '',
  `address` TEXT,
  `city` VARCHAR(128) DEFAULT '',
  `solar_capacity_kw` DECIMAL(10,2) DEFAULT 0.00,
  `estimated_value` DECIMAL(14,2) DEFAULT 0.00,
  `source` VARCHAR(64) DEFAULT 'Website',
  `assigned_salesperson_id` VARCHAR(64) DEFAULT '',
  `assigned_salesperson_name` VARCHAR(255) DEFAULT '',
  `status` VARCHAR(64) DEFAULT 'NEW',
  `notes` TEXT,
  `next_follow_up_date` DATE DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_leads_status` (`status`),
  INDEX `idx_leads_followup` (`next_follow_up_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `solar_projects`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `solar_projects` (
  `id` VARCHAR(64) PRIMARY KEY,
  `project_code` VARCHAR(32) NOT NULL UNIQUE,
  `customer_id` VARCHAR(64) NOT NULL,
  `customer_name` VARCHAR(255) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `capacity_kw` DECIMAL(10,2) NOT NULL,
  `total_value` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `status` VARCHAR(64) DEFAULT 'PLANNING',
  `current_stage_key` VARCHAR(64) DEFAULT 'site_survey',
  `completion_percentage` INT DEFAULT 0,
  `project_manager_id` VARCHAR(64) DEFAULT '',
  `project_manager_name` VARCHAR(255) DEFAULT '',
  `site_address` TEXT NOT NULL,
  `city` VARCHAR(128) NOT NULL,
  `inverter_model` VARCHAR(128) DEFAULT '',
  `panel_model` VARCHAR(128) DEFAULT '',
  `structure_type` VARCHAR(128) DEFAULT 'Elevated GI Structure',
  `start_date` DATE DEFAULT NULL,
  `expected_completion_date` DATE DEFAULT NULL,
  `actual_completion_date` DATE DEFAULT NULL,
  `notes` TEXT,
  `assignments_json` LONGTEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_projects_customer` (`customer_id`),
  INDEX `idx_projects_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `solar_project_stages`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `solar_project_stages` (
  `id` VARCHAR(64) PRIMARY KEY,
  `project_id` VARCHAR(64) NOT NULL,
  `stage_key` VARCHAR(64) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `stage_order` INT NOT NULL DEFAULT 1,
  `department` VARCHAR(64) NOT NULL,
  `assigned_role` VARCHAR(64) NOT NULL,
  `assigned_employee_id` VARCHAR(64) DEFAULT '',
  `assigned_employee_name` VARCHAR(255) DEFAULT '',
  `status` VARCHAR(64) DEFAULT 'NOT STARTED',
  `priority` VARCHAR(32) DEFAULT 'MEDIUM',
  `start_date` DATE DEFAULT NULL,
  `due_date` DATE DEFAULT NULL,
  `completed_date` DATE DEFAULT NULL,
  `checklist_json` LONGTEXT,
  `photos_json` LONGTEXT,
  `documents_json` LONGTEXT,
  `gps_location_json` LONGTEXT,
  `notes` TEXT,
  `approved_by` VARCHAR(255) DEFAULT '',
  `approved_at` DATETIME DEFAULT NULL,
  `rejection_reason` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_stages_project` (`project_id`),
  INDEX `idx_stages_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `solar_site_surveys`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `solar_site_surveys` (
  `id` VARCHAR(64) PRIMARY KEY,
  `project_id` VARCHAR(64) DEFAULT '',
  `customer_id` VARCHAR(64) DEFAULT '',
  `engineer_id` VARCHAR(64) DEFAULT '',
  `engineer_name` VARCHAR(255) NOT NULL,
  `survey_date` DATE NOT NULL,
  `status` VARCHAR(32) DEFAULT 'DRAFT',
  `site_address` TEXT NOT NULL,
  `latitude` DECIMAL(10,7) DEFAULT NULL,
  `longitude` DECIMAL(10,7) DEFAULT NULL,
  `location_name` VARCHAR(255) DEFAULT '',
  `roof_type` VARCHAR(64) DEFAULT 'RCC Flat',
  `roof_area_sqft` DECIMAL(12,2) DEFAULT 0.00,
  `shadow_free_area_sqft` DECIMAL(12,2) DEFAULT 0.00,
  `shadow_obstacles` TEXT,
  `electricity_bill_number` VARCHAR(64) DEFAULT '',
  `monthly_avg_consumption` DECIMAL(10,2) DEFAULT 0.00,
  `sanctioned_load_kw` DECIMAL(10,2) DEFAULT 0.00,
  `tariff_rate` DECIMAL(8,2) DEFAULT 0.00,
  `existing_structure_condition` TEXT,
  `recommended_capacity_kw` DECIMAL(10,2) DEFAULT 0.00,
  `feasibility_score` VARCHAR(32) DEFAULT 'GOOD',
  `photos_json` LONGTEXT,
  `notes` TEXT,
  `reviewed_by` VARCHAR(255) DEFAULT '',
  `reviewed_at` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_surveys_project` (`project_id`),
  INDEX `idx_surveys_engineer` (`engineer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `solar_quotations`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `solar_quotations` (
  `id` VARCHAR(64) PRIMARY KEY,
  `quotation_number` VARCHAR(64) NOT NULL UNIQUE,
  `customer_id` VARCHAR(64) DEFAULT '',
  `customer_name` VARCHAR(255) NOT NULL,
  `project_id` VARCHAR(64) DEFAULT '',
  `capacity_kw` DECIMAL(10,2) NOT NULL,
  `rate_per_wp` DECIMAL(10,2) DEFAULT 0.00,
  `base_amount` DECIMAL(14,2) DEFAULT 0.00,
  `tax_amount` DECIMAL(14,2) DEFAULT 0.00,
  `panel_brand` VARCHAR(128) DEFAULT '',
  `inverter_brand` VARCHAR(128) DEFAULT '',
  `structure_type` VARCHAR(128) DEFAULT '',
  `items_json` LONGTEXT,
  `subtotal` DECIMAL(14,2) DEFAULT 0.00,
  `discount_amount` DECIMAL(14,2) DEFAULT 0.00,
  `gst_percent` DECIMAL(5,2) DEFAULT 13.80,
  `gst_amount` DECIMAL(14,2) DEFAULT 0.00,
  `total_amount` DECIMAL(14,2) NOT NULL,
  `payment_terms` TEXT,
  `warranty_details` TEXT,
  `terms_and_conditions` TEXT,
  `status` VARCHAR(32) DEFAULT 'DRAFT',
  `valid_until` DATE DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `accepted_at` DATETIME DEFAULT NULL,
  INDEX `idx_quotations_customer` (`customer_id`),
  INDEX `idx_quotations_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `solar_payments`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `solar_payments` (
  `id` VARCHAR(64) PRIMARY KEY,
  `receipt_number` VARCHAR(64) NOT NULL UNIQUE,
  `project_id` VARCHAR(64) NOT NULL,
  `customer_id` VARCHAR(64) NOT NULL,
  `customer_name` VARCHAR(255) NOT NULL,
  `milestone` VARCHAR(128) NOT NULL,
  `amount` DECIMAL(14,2) NOT NULL,
  `status` VARCHAR(32) DEFAULT 'PENDING',
  `due_date` DATE DEFAULT NULL,
  `paid_date` DATE DEFAULT NULL,
  `payment_mode` VARCHAR(64) DEFAULT 'Bank NEFT/RTGS',
  `transaction_reference` VARCHAR(128) DEFAULT '',
  `notes` TEXT,
  `tally_sync_status` VARCHAR(32) DEFAULT 'NOT SYNCED',
  `tally_reference` VARCHAR(128) DEFAULT '',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_payments_project` (`project_id`),
  INDEX `idx_payments_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `solar_expenses`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `solar_expenses` (
  `id` VARCHAR(64) PRIMARY KEY,
  `expense_number` VARCHAR(64) NOT NULL UNIQUE,
  `project_id` VARCHAR(64) DEFAULT '',
  `project_code` VARCHAR(64) DEFAULT '',
  `vendor_name` VARCHAR(255) NOT NULL,
  `category` VARCHAR(128) NOT NULL,
  `amount` DECIMAL(14,2) NOT NULL,
  `expense_date` DATE NOT NULL,
  `payment_mode` VARCHAR(64) DEFAULT 'Bank Payment',
  `reference_no` VARCHAR(128) DEFAULT '',
  `notes` TEXT,
  `receipt_url` TEXT,
  `approved_by` VARCHAR(255) DEFAULT '',
  `tally_sync_status` VARCHAR(32) DEFAULT 'NOT SYNCED',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_expenses_project` (`project_id`),
  INDEX `idx_expenses_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `solar_employees`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `solar_employees` (
  `id` VARCHAR(64) PRIMARY KEY,
  `employee_code` VARCHAR(32) NOT NULL UNIQUE,
  `name` VARCHAR(255) NOT NULL,
  `photo_url` TEXT,
  `department` VARCHAR(64) NOT NULL,
  `designation` VARCHAR(128) NOT NULL,
  `phone` VARCHAR(32) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `joining_date` DATE NOT NULL,
  `salary_monthly` DECIMAL(12,2) DEFAULT 0.00,
  `status` VARCHAR(32) DEFAULT 'ACTIVE',
  `current_site_location` VARCHAR(255) DEFAULT '',
  `login_enabled` TINYINT(1) DEFAULT 1,
  `system_role` VARCHAR(64) DEFAULT 'Super Admin',
  `is_field_worker` TINYINT(1) DEFAULT 0,
  `account_status` VARCHAR(32) DEFAULT 'ACTIVE',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_employees_dept` (`department`),
  INDEX `idx_employees_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `solar_attendance`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `solar_attendance` (
  `id` VARCHAR(64) PRIMARY KEY,
  `employee_id` VARCHAR(64) NOT NULL,
  `employee_name` VARCHAR(255) NOT NULL,
  `attendance_date` DATE NOT NULL,
  `check_in_time` VARCHAR(16) NOT NULL,
  `check_out_time` VARCHAR(16) DEFAULT NULL,
  `check_in_gps_json` LONGTEXT,
  `check_out_gps_json` LONGTEXT,
  `site_project_id` VARCHAR(64) DEFAULT '',
  `site_project_title` VARCHAR(255) DEFAULT '',
  `status` VARCHAR(32) DEFAULT 'PRESENT',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_attendance_emp_date` (`employee_id`, `attendance_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `solar_payslips`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `solar_payslips` (
  `id` VARCHAR(64) PRIMARY KEY,
  `employee_id` VARCHAR(64) NOT NULL,
  `employee_name` VARCHAR(255) NOT NULL,
  `month` VARCHAR(32) NOT NULL,
  `year` INT NOT NULL,
  `basic_salary` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `allowances` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `deductions` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `net_salary` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `payment_status` VARCHAR(32) DEFAULT 'PAID',
  `payment_date` DATE DEFAULT NULL,
  `notes` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_payslips_emp` (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `solar_holidays`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `solar_holidays` (
  `id` VARCHAR(64) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `holiday_date` DATE NOT NULL,
  `type` VARCHAR(64) DEFAULT 'Mandatory',
  `description` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `solar_service_tickets`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `solar_service_tickets` (
  `id` VARCHAR(64) PRIMARY KEY,
  `ticket_id` VARCHAR(64) NOT NULL UNIQUE,
  `customer_id` VARCHAR(64) NOT NULL,
  `customer_name` VARCHAR(255) NOT NULL,
  `project_id` VARCHAR(64) NOT NULL,
  `project_title` VARCHAR(255) DEFAULT '',
  `issue` TEXT NOT NULL,
  `category` VARCHAR(64) DEFAULT 'Inverter Warning',
  `priority` VARCHAR(32) DEFAULT 'MEDIUM',
  `assigned_technician_id` VARCHAR(64) DEFAULT '',
  `assigned_technician_name` VARCHAR(255) DEFAULT '',
  `status` VARCHAR(32) DEFAULT 'OPEN',
  `scheduled_date` DATE DEFAULT NULL,
  `resolved_date` DATE DEFAULT NULL,
  `notes` TEXT,
  `photos_json` LONGTEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_tickets_customer` (`customer_id`),
  INDEX `idx_tickets_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `solar_amc_contracts`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `solar_amc_contracts` (
  `id` VARCHAR(64) PRIMARY KEY,
  `amc_code` VARCHAR(64) NOT NULL UNIQUE,
  `customer_id` VARCHAR(64) NOT NULL,
  `customer_name` VARCHAR(255) NOT NULL,
  `project_id` VARCHAR(64) NOT NULL,
  `project_title` VARCHAR(255) NOT NULL,
  `plan_name` VARCHAR(128) NOT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `renewal_date` DATE DEFAULT NULL,
  `annual_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `visits_completed` INT DEFAULT 0,
  `total_visits` INT DEFAULT 4,
  `status` VARCHAR(32) DEFAULT 'ACTIVE',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_amc_customer` (`customer_id`),
  INDEX `idx_amc_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `solar_notifications`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `solar_notifications` (
  `id` VARCHAR(64) PRIMARY KEY,
  `user_id` VARCHAR(64) DEFAULT '',
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `type` VARCHAR(32) DEFAULT 'INFO',
  `is_read` TINYINT(1) DEFAULT 0,
  `link_type` VARCHAR(32) DEFAULT NULL,
  `link_id` VARCHAR(64) DEFAULT NULL,
  `customer_id` VARCHAR(64) DEFAULT NULL,
  `project_id` VARCHAR(64) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_notif_read` (`is_read`),
  INDEX `idx_notif_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `solar_products`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `solar_products` (
  `id` VARCHAR(64) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `sku` VARCHAR(64) NOT NULL UNIQUE,
  `category` VARCHAR(64) NOT NULL,
  `brand` VARCHAR(128) DEFAULT '',
  `model` VARCHAR(128) DEFAULT '',
  `specifications` TEXT,
  `unit` VARCHAR(32) DEFAULT 'Nos',
  `hsn_code` VARCHAR(32) DEFAULT '',
  `gst_rate` DECIMAL(5,2) DEFAULT 18.00,
  `unit_price` DECIMAL(12,2) DEFAULT 0.00,
  `current_stock` DECIMAL(12,2) DEFAULT 0.00,
  `reorder_level` DECIMAL(12,2) DEFAULT 0.00,
  `warehouse_id` VARCHAR(64) DEFAULT '',
  `status` VARCHAR(32) DEFAULT 'ACTIVE',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_products_category` (`category`),
  INDEX `idx_products_sku` (`sku`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `solar_vendors`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `solar_vendors` (
  `id` VARCHAR(64) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `vendor_code` VARCHAR(32) NOT NULL UNIQUE,
  `contact_person` VARCHAR(128) DEFAULT '',
  `phone` VARCHAR(32) DEFAULT '',
  `email` VARCHAR(191) DEFAULT '',
  `address` TEXT,
  `city` VARCHAR(128) DEFAULT '',
  `state` VARCHAR(128) DEFAULT '',
  `gst_number` VARCHAR(32) DEFAULT '',
  `pan_number` VARCHAR(32) DEFAULT '',
  `payment_terms` VARCHAR(128) DEFAULT '30 Days',
  `rating` DECIMAL(3,1) DEFAULT 4.5,
  `categories_json` LONGTEXT,
  `status` VARCHAR(32) DEFAULT 'ACTIVE',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_vendors_code` (`vendor_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `solar_purchase_orders`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `solar_purchase_orders` (
  `id` VARCHAR(64) PRIMARY KEY,
  `po_number` VARCHAR(64) NOT NULL UNIQUE,
  `vendor_id` VARCHAR(64) NOT NULL,
  `vendor_name` VARCHAR(255) NOT NULL,
  `po_date` DATE NOT NULL,
  `expected_delivery_date` DATE DEFAULT NULL,
  `project_id` VARCHAR(64) DEFAULT '',
  `items_json` LONGTEXT NOT NULL,
  `subtotal` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `gst_amount` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `total_amount` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `status` VARCHAR(32) DEFAULT 'ISSUED',
  `payment_status` VARCHAR(32) DEFAULT 'PENDING',
  `receipts_json` LONGTEXT,
  `notes` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_po_vendor` (`vendor_id`),
  INDEX `idx_po_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `solar_boms`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `solar_boms` (
  `id` VARCHAR(64) PRIMARY KEY,
  `bom_number` VARCHAR(64) NOT NULL UNIQUE,
  `project_id` VARCHAR(64) NOT NULL,
  `project_title` VARCHAR(255) NOT NULL,
  `system_capacity_kw` DECIMAL(10,2) NOT NULL,
  `version` VARCHAR(16) DEFAULT '1.0',
  `status` VARCHAR(32) DEFAULT 'APPROVED',
  `items_json` LONGTEXT NOT NULL,
  `total_estimated_cost` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `created_by` VARCHAR(128) DEFAULT '',
  `approved_by` VARCHAR(128) DEFAULT '',
  `notes` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_boms_project` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `solar_sales_invoices`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `solar_sales_invoices` (
  `id` VARCHAR(64) PRIMARY KEY,
  `invoice_number` VARCHAR(64) NOT NULL UNIQUE,
  `project_id` VARCHAR(64) DEFAULT '',
  `customer_id` VARCHAR(64) NOT NULL,
  `customer_name` VARCHAR(255) NOT NULL,
  `invoice_date` DATE NOT NULL,
  `due_date` DATE DEFAULT NULL,
  `items_json` LONGTEXT NOT NULL,
  `subtotal` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `gst_amount` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `total_amount` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `payment_status` VARCHAR(32) DEFAULT 'UNPAID',
  `paid_amount` DECIMAL(14,2) DEFAULT 0.00,
  `balance_amount` DECIMAL(14,2) DEFAULT 0.00,
  `eway_bill_number` VARCHAR(64) DEFAULT '',
  `eway_bill_details_json` LONGTEXT,
  `warehouse_id` VARCHAR(64) DEFAULT '',
  `notes` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_invoices_customer` (`customer_id`),
  INDEX `idx_invoices_status` (`payment_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `solar_warehouses`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `solar_warehouses` (
  `id` VARCHAR(64) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `code` VARCHAR(32) NOT NULL UNIQUE,
  `address` TEXT NOT NULL,
  `city` VARCHAR(128) NOT NULL,
  `state` VARCHAR(128) DEFAULT '',
  `pincode` VARCHAR(16) DEFAULT '',
  `manager_name` VARCHAR(128) DEFAULT '',
  `manager_phone` VARCHAR(32) DEFAULT '',
  `gst_number` VARCHAR(32) DEFAULT '',
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `solar_stock_movements`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `solar_stock_movements` (
  `id` VARCHAR(64) PRIMARY KEY,
  `product_id` VARCHAR(64) NOT NULL,
  `product_name` VARCHAR(255) NOT NULL,
  `sku` VARCHAR(64) DEFAULT '',
  `movement_type` VARCHAR(64) NOT NULL,
  `quantity` DECIMAL(12,2) NOT NULL,
  `balance_after` DECIMAL(12,2) NOT NULL,
  `reference_number` VARCHAR(64) DEFAULT '',
  `warehouse_id` VARCHAR(64) DEFAULT '',
  `notes` TEXT,
  `timestamp` DATETIME NOT NULL,
  `performed_by` VARCHAR(128) DEFAULT '',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_sm_product` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `solar_stock_audits`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `solar_stock_audits` (
  `id` VARCHAR(64) PRIMARY KEY,
  `audit_number` VARCHAR(64) NOT NULL UNIQUE,
  `warehouse_id` VARCHAR(64) NOT NULL,
  `warehouse_name` VARCHAR(255) NOT NULL,
  `audit_date` DATE NOT NULL,
  `auditor_name` VARCHAR(128) NOT NULL,
  `status` VARCHAR(32) DEFAULT 'COMPLETED',
  `discrepancies_count` INT DEFAULT 0,
  `items_json` LONGTEXT NOT NULL,
  `notes` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `solar_acl_config`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `solar_acl_config` (
  `id` VARCHAR(64) PRIMARY KEY,
  `config_json` LONGTEXT NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `solar_acl_audit_logs`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `solar_acl_audit_logs` (
  `id` VARCHAR(64) PRIMARY KEY,
  `actor_id` VARCHAR(64) NOT NULL,
  `actor_name` VARCHAR(255) NOT NULL,
  `actor_role` VARCHAR(64) NOT NULL,
  `action` VARCHAR(64) NOT NULL,
  `target_role` VARCHAR(64) DEFAULT '',
  `details` TEXT NOT NULL,
  `timestamp` DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `solar_system_settings`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `solar_system_settings` (
  `setting_key` VARCHAR(64) PRIMARY KEY,
  `setting_value` LONGTEXT NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `solar_workforce_locations`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `solar_workforce_locations` (
  `user_id` VARCHAR(64) PRIMARY KEY,
  `employee_code` VARCHAR(64) DEFAULT '',
  `name` VARCHAR(255) DEFAULT '',
  `email` VARCHAR(191) DEFAULT '',
  `role` VARCHAR(64) DEFAULT '',
  `latitude` DECIMAL(10,7) DEFAULT NULL,
  `longitude` DECIMAL(10,7) DEFAULT NULL,
  `accuracy` DECIMAL(8,2) DEFAULT NULL,
  `heading` DECIMAL(8,2) DEFAULT NULL,
  `speed` DECIMAL(8,2) DEFAULT NULL,
  `battery_level` INT DEFAULT NULL,
  `activity` VARCHAR(128) DEFAULT '',
  `is_online` TINYINT(1) DEFAULT 0,
  `is_sharing_location` TINYINT(1) DEFAULT 0,
  `status` VARCHAR(32) DEFAULT 'offline',
  `last_seen_at` DATETIME DEFAULT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================================
-- DATA MIGRATION: POPULATING ALL EXISTING PRODUCTION DATA
-- ==========================================================

-- Pushing users data into solar_users
INSERT INTO `solar_users` (`id`, `name`, `email`, `password`, `role`, `phone`, `department`, `designation`, `employee_id`, `is_field_worker`, `status`)
VALUES ('demo-usr-1', 'Admin Demo', 'admin@rejoysolar.com', '123456', 'Admin', '+91 98000 00000', 'Administration', 'Admin', 'EMP001', 0, 'ACTIVE')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `role` = VALUES(`role`), `password` = VALUES(`password`);
INSERT INTO `solar_users` (`id`, `name`, `email`, `password`, `role`, `phone`, `department`, `designation`, `employee_id`, `is_field_worker`, `status`)
VALUES ('demo-usr-2', 'Sales Manager Demo', 'salesmanager@rejoysolar.com', '123456', 'Sales Manager', '+91 98000 00000', 'Sales', 'Sales Manager', 'EMP002', 0, 'ACTIVE')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `role` = VALUES(`role`), `password` = VALUES(`password`);
INSERT INTO `solar_users` (`id`, `name`, `email`, `password`, `role`, `phone`, `department`, `designation`, `employee_id`, `is_field_worker`, `status`)
VALUES ('demo-usr-3', 'Sales Executive Demo', 'salesexecutive@rejoysolar.com', '123456', 'Sales Executive', '+91 98000 00000', 'Sales', 'Sales Executive', 'EMP003', 0, 'ACTIVE')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `role` = VALUES(`role`), `password` = VALUES(`password`);
INSERT INTO `solar_users` (`id`, `name`, `email`, `password`, `role`, `phone`, `department`, `designation`, `employee_id`, `is_field_worker`, `status`)
VALUES ('demo-usr-4', 'Project Manager Demo', 'projectmanager@rejoysolar.com', '123456', 'Project Manager', '+91 98000 00000', 'Operations', 'Project Manager', 'EMP004', 0, 'ACTIVE')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `role` = VALUES(`role`), `password` = VALUES(`password`);
INSERT INTO `solar_users` (`id`, `name`, `email`, `password`, `role`, `phone`, `department`, `designation`, `employee_id`, `is_field_worker`, `status`)
VALUES ('demo-usr-5', 'Site Survey Engineer Demo', 'sitesurveyengineer@rejoysolar.com', '123456', 'Site Survey Engineer', '+91 98000 00000', 'Engineering', 'Site Survey Engineer', 'EMP005', 1, 'ACTIVE')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `role` = VALUES(`role`), `password` = VALUES(`password`);
INSERT INTO `solar_users` (`id`, `name`, `email`, `password`, `role`, `phone`, `department`, `designation`, `employee_id`, `is_field_worker`, `status`)
VALUES ('demo-usr-6', 'Site Inspector Demo', 'siteinspector@rejoysolar.com', '123456', 'Site Inspector', '+91 98000 00000', 'Engineering', 'Site Inspector', 'EMP006', 1, 'ACTIVE')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `role` = VALUES(`role`), `password` = VALUES(`password`);
INSERT INTO `solar_users` (`id`, `name`, `email`, `password`, `role`, `phone`, `department`, `designation`, `employee_id`, `is_field_worker`, `status`)
VALUES ('demo-usr-7', 'Civil Team Demo', 'civilteam@rejoysolar.com', '123456', 'Civil Team', '+91 98000 00000', 'Civil', 'Civil Team', 'EMP007', 1, 'ACTIVE')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `role` = VALUES(`role`), `password` = VALUES(`password`);
INSERT INTO `solar_users` (`id`, `name`, `email`, `password`, `role`, `phone`, `department`, `designation`, `employee_id`, `is_field_worker`, `status`)
VALUES ('demo-usr-8', 'Structure Team Demo', 'structureteam@rejoysolar.com', '123456', 'Structure Team', '+91 98000 00000', 'Structure', 'Structure Team', 'EMP008', 1, 'ACTIVE')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `role` = VALUES(`role`), `password` = VALUES(`password`);
INSERT INTO `solar_users` (`id`, `name`, `email`, `password`, `role`, `phone`, `department`, `designation`, `employee_id`, `is_field_worker`, `status`)
VALUES ('demo-usr-9', 'Installation Team Demo', 'installationteam@rejoysolar.com', '123456', 'Installation Team', '+91 98000 00000', 'Installation', 'Installation Team', 'EMP009', 1, 'ACTIVE')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `role` = VALUES(`role`), `password` = VALUES(`password`);
INSERT INTO `solar_users` (`id`, `name`, `email`, `password`, `role`, `phone`, `department`, `designation`, `employee_id`, `is_field_worker`, `status`)
VALUES ('demo-usr-10', 'Electrical Team Demo', 'electricalteam@rejoysolar.com', '123456', 'Electrical Team', '+91 98000 00000', 'Electrical', 'Electrical Team', 'EMP0010', 1, 'ACTIVE')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `role` = VALUES(`role`), `password` = VALUES(`password`);
INSERT INTO `solar_users` (`id`, `name`, `email`, `password`, `role`, `phone`, `department`, `designation`, `employee_id`, `is_field_worker`, `status`)
VALUES ('demo-usr-11', 'Accountant Demo', 'accountant@rejoysolar.com', '123456', 'Accountant', '+91 98000 00000', 'Finance', 'Accountant', 'EMP0011', 0, 'ACTIVE')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `role` = VALUES(`role`), `password` = VALUES(`password`);
INSERT INTO `solar_users` (`id`, `name`, `email`, `password`, `role`, `phone`, `department`, `designation`, `employee_id`, `is_field_worker`, `status`)
VALUES ('demo-usr-12', 'Service Manager Demo', 'servicemanager@rejoysolar.com', '123456', 'Service Manager', '+91 98000 00000', 'Service', 'Service Manager', 'EMP0012', 0, 'ACTIVE')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `role` = VALUES(`role`), `password` = VALUES(`password`);
INSERT INTO `solar_users` (`id`, `name`, `email`, `password`, `role`, `phone`, `department`, `designation`, `employee_id`, `is_field_worker`, `status`)
VALUES ('demo-usr-13', 'Technician Demo', 'technician@rejoysolar.com', '123456', 'Technician', '+91 98000 00000', 'Service', 'Technician', 'EMP0013', 1, 'ACTIVE')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `role` = VALUES(`role`), `password` = VALUES(`password`);
INSERT INTO `solar_users` (`id`, `name`, `email`, `password`, `role`, `phone`, `department`, `designation`, `employee_id`, `is_field_worker`, `status`)
VALUES ('demo-usr-14', 'HR Manager Demo', 'hrmanager@rejoysolar.com', '123456', 'HR Manager', '+91 98000 00000', 'HR', 'HR Manager', 'EMP0014', 0, 'ACTIVE')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `role` = VALUES(`role`), `password` = VALUES(`password`);
INSERT INTO `solar_users` (`id`, `name`, `email`, `password`, `role`, `phone`, `department`, `designation`, `employee_id`, `is_field_worker`, `status`)
VALUES ('demo-usr-15', 'Customer Demo', 'customer@rejoysolar.com', '123456', 'Customer', '+91 98000 00000', 'Customer', 'Customer', 'EMP0015', 0, 'ACTIVE')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `role` = VALUES(`role`), `password` = VALUES(`password`);

-- Pushing 6 records into solar_customers
INSERT INTO `solar_customers` (`id`, `customer_code`, `name`, `company_name`, `customer_type`, `phone`, `email`, `password`, `site_address`, `city`, `state`, `pincode`, `gst_number`, `electricity_consumer_no`, `sanctioned_load_kw`, `status`, `active_project_id`)
VALUES ('cust-manohar', 'cust-manohar', 'Manohar Gyan Chandani', 'Manohar Gyan Chandani', 'Commercial', '+91 98271 22334', 'manohar.chandani@gmail.com', '123456', 'Kadambari Nagar', 'Durg', 'Chhattisgarh', '491001', '', 'CSPDCL-HT-88219', 25, 'ACTIVE', 'proj-manohar')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `phone` = VALUES(`phone`), `password` = VALUES(`password`), `email` = VALUES(`email`);
INSERT INTO `solar_customers` (`id`, `customer_code`, `name`, `company_name`, `customer_type`, `phone`, `email`, `password`, `site_address`, `city`, `state`, `pincode`, `gst_number`, `electricity_consumer_no`, `sanctioned_load_kw`, `status`, `active_project_id`)
VALUES ('cust-1', 'cust-1', 'ABC Industries Ltd.', 'ABC Heavy Engineering Private Limited', 'Industrial', '+91 98795 44321', 'customer@rejoysolar.com', '123456', 'Plot No. 42-45, GIDC Industrial Estate, Sanand', 'Ahmedabad', 'Gujarat', '382110', '24AAACA1234F1Z5', 'SAN-HT-99210', 150, 'ACTIVE', 'proj-1')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `phone` = VALUES(`phone`), `password` = VALUES(`password`), `email` = VALUES(`email`);
INSERT INTO `solar_customers` (`id`, `customer_code`, `name`, `company_name`, `customer_type`, `phone`, `email`, `password`, `site_address`, `city`, `state`, `pincode`, `gst_number`, `electricity_consumer_no`, `sanctioned_load_kw`, `status`, `active_project_id`)
VALUES ('cust-2', 'cust-2', 'Zenith Textiles Mills', 'Zenith Spinning & Weaving Ltd.', 'Industrial', '+91 98240 88776', 'planthead@zenithtextiles.com', '123456', 'Survey No. 118, NH-48, Sachin', 'Surat', 'Gujarat', '394230', '24AAACZ5678G2Z4', 'SUR-HT-44812', 350, 'ACTIVE', 'proj-2')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `phone` = VALUES(`phone`), `password` = VALUES(`password`), `email` = VALUES(`email`);
INSERT INTO `solar_customers` (`id`, `customer_code`, `name`, `company_name`, `customer_type`, `phone`, `email`, `password`, `site_address`, `city`, `state`, `pincode`, `gst_number`, `electricity_consumer_no`, `sanctioned_load_kw`, `status`, `active_project_id`)
VALUES ('cust-3', 'cust-3', 'Apex Super Specialty Hospital', 'Apex Healthcare Foundation', 'Commercial', '+91 98255 12345', 'admin@apexhospital.org', '123456', 'Ring Road, Near Judges Bungalow, Bodakdev', 'Ahmedabad', 'Gujarat', '380054', '24AABCA9012H3Z1', 'AHM-LT-55421', 60, 'ACTIVE', 'proj-3')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `phone` = VALUES(`phone`), `password` = VALUES(`password`), `email` = VALUES(`email`);
INSERT INTO `solar_customers` (`id`, `customer_code`, `name`, `company_name`, `customer_type`, `phone`, `email`, `password`, `site_address`, `city`, `state`, `pincode`, `gst_number`, `electricity_consumer_no`, `sanctioned_load_kw`, `status`, `active_project_id`)
VALUES ('cust-4', 'cust-4', 'GreenTech Logistics Hub', 'GreenTech Warehousing LLP', 'Commercial', '+91 97277 65432', 'operations@greentechlogistics.in', '123456', 'Warehousing Zone, Changodar', 'Ahmedabad', 'Gujarat', '382213', '24AAAFG3456J4Z7', 'CHN-HT-12345', 80, 'COMPLETED', 'proj-4')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `phone` = VALUES(`phone`), `password` = VALUES(`password`), `email` = VALUES(`email`);
INSERT INTO `solar_customers` (`id`, `customer_code`, `name`, `company_name`, `customer_type`, `phone`, `email`, `password`, `site_address`, `city`, `state`, `pincode`, `gst_number`, `electricity_consumer_no`, `sanctioned_load_kw`, `status`, `active_project_id`)
VALUES ('cust-5', 'cust-5', 'Sunrise Cold Storage & Agro', 'Sunrise Agri Infrastructure Pvt Ltd', 'Agricultural', '+91 98980 11998', 'info@sunrisecoldstorage.com', '123456', 'Mahuva Highway, Talaja Road', 'Bhavnagar', 'Gujarat', '364140', '24AAACS7890K5Z9', 'BHV-HT-88712', 120, 'ACTIVE', 'proj-5')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `phone` = VALUES(`phone`), `password` = VALUES(`password`), `email` = VALUES(`email`);

-- Pushing 5 records into solar_leads
INSERT INTO `solar_leads` (`id`, `customer_name`, `company_name`, `phone`, `email`, `address`, `city`, `solar_capacity_kw`, `estimated_value`, `source`, `assigned_salesperson_id`, `assigned_salesperson_name`, `status`, `notes`, `next_follow_up_date`)
VALUES ('lead-1', 'Shree Ram Plastics', 'Shree Ram Polyfilms Pvt Ltd', '+91 98251 77123', 'purchase@shreeramfilms.com', 'Phase IV, Vatva GIDC', 'Ahmedabad', 80, 3800000, 'Website', 'emp-4', 'Priya Verma', 'QUALIFIED', 'Power bill is ₹2.2L/month. High daytime load. Requested site survey scheduling.', '2026-09-09')
ON DUPLICATE KEY UPDATE `customer_name` = VALUES(`customer_name`), `status` = VALUES(`status`);
INSERT INTO `solar_leads` (`id`, `customer_name`, `company_name`, `phone`, `email`, `address`, `city`, `solar_capacity_kw`, `estimated_value`, `source`, `assigned_salesperson_id`, `assigned_salesperson_name`, `status`, `notes`, `next_follow_up_date`)
VALUES ('lead-2', 'Kalyan Packaging Solutions', 'Kalyan Corrugators LLP', '+91 97129 33445', 'kalyan.pack@gmail.com', 'Plot 18, Halol Industrial Area', 'Vadodara', 150, 7200000, 'Referral', 'emp-5', 'Rahul Mehta', 'SITE SURVEY', 'Survey assigned to Rajesh Kumar. Rooftop is tin-shed. Shadow analysis needed for adjacent chimney.', '2026-09-08')
ON DUPLICATE KEY UPDATE `customer_name` = VALUES(`customer_name`), `status` = VALUES(`status`);
INSERT INTO `solar_leads` (`id`, `customer_name`, `company_name`, `phone`, `email`, `address`, `city`, `solar_capacity_kw`, `estimated_value`, `source`, `assigned_salesperson_id`, `assigned_salesperson_name`, `status`, `notes`, `next_follow_up_date`)
VALUES ('lead-3', 'Silver Oak Elite Villas Society', 'Silver Oak Resident Welfare Association', '+91 99099 44556', 'rwa.silveroak@yahoo.com', 'Off SG Highway, Gota', 'Ahmedabad', 35, 1850000, 'Direct Call', 'emp-5', 'Rahul Mehta', 'PROPOSAL', 'Common utility meter. Submitted proposal with 540W Mono PERC bifacial modules.', '2026-09-10')
ON DUPLICATE KEY UPDATE `customer_name` = VALUES(`customer_name`), `status` = VALUES(`status`);
INSERT INTO `solar_leads` (`id`, `customer_name`, `company_name`, `phone`, `email`, `address`, `city`, `solar_capacity_kw`, `estimated_value`, `source`, `assigned_salesperson_id`, `assigned_salesperson_name`, `status`, `notes`, `next_follow_up_date`)
VALUES ('lead-4', 'Navkar Diamond Tools', 'Navkar Precision Tools Corp', '+91 98254 99002', 'navkardiamond@rediffmail.com', 'Katargam GIDC', 'Surat', 50, 2450000, 'Exhibition', 'emp-4', 'Priya Verma', 'NEGOTIATION', 'Quotation sent. Customer asked for 5% discount on turnkey EPC and 5-year AMC inclusion.', '2026-09-07')
ON DUPLICATE KEY UPDATE `customer_name` = VALUES(`customer_name`), `status` = VALUES(`status`);
INSERT INTO `solar_leads` (`id`, `customer_name`, `company_name`, `phone`, `email`, `address`, `city`, `solar_capacity_kw`, `estimated_value`, `source`, `assigned_salesperson_id`, `assigned_salesperson_name`, `status`, `notes`, `next_follow_up_date`)
VALUES ('lead-5', 'Balaji Cold Chain Logistics', 'Balaji Agro Cold Storage', '+91 98242 11889', 'balajicold@gmail.com', 'Deesa Road, Chhapi', 'Palanpur', 200, 9500000, 'Agent', 'emp-4', 'Priya Verma', 'NEW', 'Inquiry received via agent commission network. 200 kW ground mount + rooftop mix.', '2026-09-07')
ON DUPLICATE KEY UPDATE `customer_name` = VALUES(`customer_name`), `status` = VALUES(`status`);

-- Pushing 5 records into solar_projects and stages
INSERT INTO `solar_projects` (`id`, `project_code`, `customer_id`, `customer_name`, `title`, `capacity_kw`, `total_value`, `status`, `current_stage_key`, `completion_percentage`, `project_manager_id`, `project_manager_name`, `site_address`, `city`, `inverter_model`, `panel_model`, `structure_type`, `start_date`, `expected_completion_date`, `notes`, `assignments_json`)
VALUES ('proj-1', 'SOL-2026-001', 'cust-1', 'ABC Industries Ltd.', '100 kW Rooftop Solar Project', 100, 5000000, 'INSTALLATION', 'solar_installation', 68, 'emp-2', 'Amit Sharma', 'Plot No. 42-45, GIDC Industrial Estate, Sanand, Ahmedabad', 'Ahmedabad', '', '', 'Elevated GI Structure', '2026-08-12', '2026-09-18', 'Premium commercial rooftop installation with 540W Mono PERC Bifacial modules and Sungrow 100kW Inverter. Client requires early commissioning before month-end billing cycle.', '[]')
ON DUPLICATE KEY UPDATE `title` = VALUES(`title`), `status` = VALUES(`status`), `completion_percentage` = VALUES(`completion_percentage`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-1-stage-1', 'proj-1', 'site_survey', 'Site Survey', 1, 'Engineering', 'Site Survey Engineer', 'emp-3', 'Rajesh Kumar', 'COMPLETED', 'HIGH', '2026-08-12', '2026-08-15', '2026-08-15', '[{"id":"chk-1-1","title":"GPS coordinates & roof orientation verified","label":"GPS coordinates & roof orientation verified","completed":true,"completedAt":"2026-08-16","completedBy":"Rajesh Kumar"},{"id":"chk-1-2","title":"Shadow analysis & obstacle mapping","label":"Shadow analysis & obstacle mapping","completed":true,"completedAt":"2026-08-16","completedBy":"Rajesh Kumar"},{"id":"chk-1-3","title":"Electricity bill & sanctioned load audited","label":"Electricity bill & sanctioned load audited","completed":true,"completedAt":"2026-08-16","completedBy":"Rajesh Kumar"},{"id":"chk-1-4","title":"Structural load bearing & slab condition check","label":"Structural load bearing & slab condition check","completed":true,"completedAt":"2026-08-16","completedBy":"Rajesh Kumar"},{"id":"chk-1-5","title":"Cable routing distance to LT panel measured","label":"Cable routing distance to LT panel measured","completed":true,"completedAt":"2026-08-16","completedBy":"Rajesh Kumar"},{"id":"chk-1-6","title":"Site panoramic photos captured","label":"Site panoramic photos captured","completed":true,"completedAt":"2026-08-16","completedBy":"Rajesh Kumar"}]', '[{"id":"p-1","url":"https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&q=80&w=400","caption":"Rooftop South view prior to installation","type":"BEFORE","uploadedAt":"2026-08-14T11:40:00Z","uploadedBy":"Rajesh Kumar","gpsCoordinates":"22.9868, 72.3789"},{"id":"p-2","url":"https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?auto=format&fit=crop&q=80&w=400","caption":"LT panel room measurement inspection","type":"DURING","uploadedAt":"2026-08-14T12:00:00Z","uploadedBy":"Rajesh Kumar","gpsCoordinates":"22.9868, 72.3789"}]', '[{"id":"doc-1","name":"Site_Survey_Report_proj-1.pdf","url":"#","fileType":"pdf","sizeMb":2.8,"uploadedAt":"2026-08-14","uploadedBy":"Rajesh Kumar"}]', '', 'Amit Sharma (PM)')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-1-stage-2', 'proj-1', 'customer_confirmation', 'Customer Confirmation & Engineering Approval', 2, 'Sales & Engineering', 'Project Manager', 'emp-2', 'Amit Sharma', 'COMPLETED', 'HIGH', '2026-08-12', '2026-08-15', '2026-08-15', '[{"id":"chk-2-1","title":"3D Shadow Simulation & PVsyst report approved by client","label":"3D Shadow Simulation & PVsyst report approved by client","completed":true,"completedAt":"2026-08-16","completedBy":"Amit Sharma"},{"id":"chk-2-2","title":"Single Line Diagram (SLD) signed off","label":"Single Line Diagram (SLD) signed off","completed":true,"completedAt":"2026-08-16","completedBy":"Amit Sharma"},{"id":"chk-2-3","title":"Quotation & Payment milestone contract executed","label":"Quotation & Payment milestone contract executed","completed":true,"completedAt":"2026-08-16","completedBy":"Amit Sharma"},{"id":"chk-2-4","title":"Advance milestone payment confirmed","label":"Advance milestone payment confirmed","completed":true,"completedAt":"2026-08-16","completedBy":"Amit Sharma"},{"id":"chk-2-5","title":"BOM generation & procurement requisition raised","label":"BOM generation & procurement requisition raised","completed":true,"completedAt":"2026-08-16","completedBy":"Amit Sharma"}]', '[]', '[]', '', 'Amit Sharma (PM)')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-1-stage-3', 'proj-1', 'civil_work', 'Civil Work', 3, 'Civil', 'Civil Team', 'emp-3', 'Rajesh Kumar', 'COMPLETED', 'HIGH', '2026-08-12', '2026-08-15', '2026-08-15', '[{"id":"chk-3-1","title":"RCC foundation pedestal column layout marking","label":"RCC foundation pedestal column layout marking","completed":true,"completedAt":"2026-08-16","completedBy":"Rajesh Kumar"},{"id":"chk-3-2","title":"Anchor bolt drilling and chemical anchoring","label":"Anchor bolt drilling and chemical anchoring","completed":true,"completedAt":"2026-08-16","completedBy":"Rajesh Kumar"},{"id":"chk-3-3","title":"Casting of RCC pedestals with M25 concrete grade","label":"Casting of RCC pedestals with M25 concrete grade","completed":true,"completedAt":"2026-08-16","completedBy":"Rajesh Kumar"},{"id":"chk-3-4","title":"Curing period of 7 days completed","label":"Curing period of 7 days completed","completed":true,"completedAt":"2026-08-16","completedBy":"Rajesh Kumar"},{"id":"chk-3-5","title":"Waterproofing chemical coating around pedestals","label":"Waterproofing chemical coating around pedestals","completed":true,"completedAt":"2026-08-16","completedBy":"Rajesh Kumar"}]', '[{"id":"p-3","url":"https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&q=80&w=400","caption":"M25 RCC Pedestals with chemical waterproofing coat","type":"DURING","uploadedAt":"2026-08-20T16:00:00Z","uploadedBy":"Rajesh Kumar","gpsCoordinates":"22.9868, 72.3789"}]', '[]', '', 'Amit Sharma (PM)')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-1-stage-4', 'proj-1', 'structure_fabrication', 'Structure Installation & Fabrication', 4, 'Structure', 'Structure Team', 'emp-6', 'Dinesh Yadav', 'COMPLETED', 'HIGH', '2026-08-12', '2026-08-15', '2026-08-15', '[{"id":"chk-4-1","title":"Hot Dip Galvanized (HDG) steel column erection","label":"Hot Dip Galvanized (HDG) steel column erection","completed":true,"completedAt":"2026-08-16","completedBy":"Dinesh Yadav"},{"id":"chk-4-2","title":"Rafters, purlins and bracing assembly","label":"Rafters, purlins and bracing assembly","completed":true,"completedAt":"2026-08-16","completedBy":"Dinesh Yadav"},{"id":"chk-4-3","title":"Tilt angle verification with digital inclinometer (23° South)","label":"Tilt angle verification with digital inclinometer (23° South)","completed":true,"completedAt":"2026-08-16","completedBy":"Dinesh Yadav"},{"id":"chk-4-4","title":"Torque tightening of high tensile grade 8.8 bolts","label":"Torque tightening of high tensile grade 8.8 bolts","completed":true,"completedAt":"2026-08-16","completedBy":"Dinesh Yadav"},{"id":"chk-4-5","title":"Corrosion inspection and cold galvanizing spray applied","label":"Corrosion inspection and cold galvanizing spray applied","completed":true,"completedAt":"2026-08-16","completedBy":"Dinesh Yadav"}]', '[{"id":"p-4","url":"https://images.unsplash.com/photo-1545208942-e1c9c916524b?auto=format&fit=crop&q=80&w=400","caption":"HDG 80 Micron elevated structure assembled","type":"DURING","uploadedAt":"2026-08-25T14:30:00Z","uploadedBy":"Dinesh Yadav","gpsCoordinates":"22.9868, 72.3789"}]', '[]', '', 'Amit Sharma (PM)')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-1-stage-5', 'proj-1', 'lightning_arrestor', 'Lightning Arrestor (LA)', 5, 'Electrical', 'Electrical Team', 'emp-8', 'Ankit Joshi', 'COMPLETED', 'MEDIUM', '2026-08-12', '2026-08-15', '2026-08-15', '[{"id":"chk-5-1","title":"ESE / Conventional Lightning Mast installation at highest peak","label":"ESE / Conventional Lightning Mast installation at highest peak","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"},{"id":"chk-5-2","title":"Dedicated 25x3 mm Copper / GI down conductor routing","label":"Dedicated 25x3 mm Copper / GI down conductor routing","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"},{"id":"chk-5-3","title":"Insulator standoff clamping at 1 meter intervals","label":"Insulator standoff clamping at 1 meter intervals","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"},{"id":"chk-5-4","title":"Direct path to designated LA earthing pit without bends","label":"Direct path to designated LA earthing pit without bends","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"},{"id":"chk-5-5","title":"Strike counter and test link mounted","label":"Strike counter and test link mounted","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"}]', '[]', '[]', '', 'Amit Sharma (PM)')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-1-stage-6', 'proj-1', 'cdc_earthing', 'CDC & Earthing Routing', 6, 'Electrical', 'Electrical Team', 'emp-8', 'Ankit Joshi', 'COMPLETED', 'HIGH', '2026-08-12', '2026-08-15', '2026-08-15', '[{"id":"chk-6-1","title":"DC Cable trenching / UV-resistant conduit routing","label":"DC Cable trenching / UV-resistant conduit routing","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"},{"id":"chk-6-2","title":"Dual earthing of module mounting structure with 25x3 strip","label":"Dual earthing of module mounting structure with 25x3 strip","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"},{"id":"chk-6-3","title":"Perforated cable trays with covers installed","label":"Perforated cable trays with covers installed","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"},{"id":"chk-6-4","title":"Inverter chassis body earthing interconnection","label":"Inverter chassis body earthing interconnection","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"},{"id":"chk-6-5","title":"Bimetallic washers used on aluminium-copper transitions","label":"Bimetallic washers used on aluminium-copper transitions","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"}]', '[]', '[]', '', 'Amit Sharma (PM)')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-1-stage-7', 'proj-1', 'earthing_pits', 'Chemical Earthing Pits', 7, 'Electrical', 'Electrical Team', 'emp-8', 'Ankit Joshi', 'COMPLETED', 'HIGH', '2026-08-12', '2026-08-15', '2026-08-15', '[{"id":"chk-7-1","title":"Boring of 3-meter deep chemical earthing pits (4 Nos)","label":"Boring of 3-meter deep chemical earthing pits (4 Nos)","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"},{"id":"chk-7-2","title":"Insertion of 50mm copper bonded / GI pipe electrode","label":"Insertion of 50mm copper bonded / GI pipe electrode","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"},{"id":"chk-7-3","title":"Backfilling with eco-friendly conductive compound (BFC)","label":"Backfilling with eco-friendly conductive compound (BFC)","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"},{"id":"chk-7-4","title":"Civil inspection chamber & heavy duty pit covers installed","label":"Civil inspection chamber & heavy duty pit covers installed","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"},{"id":"chk-7-5","title":"Earth resistance measurement with digital earth tester (< 2 Ohm)","label":"Earth resistance measurement with digital earth tester (< 2 Ohm)","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"}]', '[{"id":"p-5","url":"https://images.unsplash.com/photo-1559302504-64aae6ca6b6f?auto=format&fit=crop&q=80&w=400","caption":"Chemical earth pit chamber with digital resistance test","type":"AFTER","uploadedAt":"2026-08-30T17:00:00Z","uploadedBy":"Ankit Joshi","gpsCoordinates":"22.9868, 72.3789"}]', '[]', '', 'Amit Sharma (PM)')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-1-stage-8', 'proj-1', 'solar_installation', 'Solar Module Installation', 8, 'Installation', 'Installation Team', 'emp-7', 'Manoj Tiwari', 'IN PROGRESS', 'HIGH', '2026-10-13', '2026-11-10', NULL, '[{"id":"chk-8-1","title":"Tier-1 Mono PERC Bifacial module inspection (zero micro-cracks)","label":"Tier-1 Mono PERC Bifacial module inspection (zero micro-cracks)","completed":true,"completedAt":"2026-09-02","completedBy":"Manoj Tiwari"},{"id":"chk-8-2","title":"Module mounting with mid-clamps and end-clamps","label":"Module mounting with mid-clamps and end-clamps","completed":true,"completedAt":"2026-09-02","completedBy":"Manoj Tiwari"},{"id":"chk-8-3","title":"MC4 connector crimping with professional ratchet tool","label":"MC4 connector crimping with professional ratchet tool","completed":true,"completedAt":"2026-09-02","completedBy":"Manoj Tiwari"},{"id":"chk-8-4","title":"String Voc and Isc measurement with calibrated multimeter","label":"String Voc and Isc measurement with calibrated multimeter","completed":false},{"id":"chk-8-5","title":"String cable dressing and UV zip-tying under modules","label":"String cable dressing and UV zip-tying under modules","completed":false}]', '[]', '[]', '', '')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-1-stage-9', 'proj-1', 'inverter_installation', 'Inverter Installation', 9, 'Electrical', 'Electrical Team', 'emp-8', 'Ankit Joshi', 'IN PROGRESS', 'HIGH', '2026-10-13', '2026-11-13', NULL, '[{"id":"chk-9-1","title":"Wall / canopy mounting in well-ventilated shaded location","label":"Wall / canopy mounting in well-ventilated shaded location","completed":true,"completedAt":"2026-09-04","completedBy":"Ankit Joshi"},{"id":"chk-9-2","title":"DC cable landing with fuse terminal blocks","label":"DC cable landing with fuse terminal blocks","completed":false},{"id":"chk-9-3","title":"AC output termination with heavy duty copper lugs","label":"AC output termination with heavy duty copper lugs","completed":false},{"id":"chk-9-4","title":"Communication RS485 / Modbus cabling routed","label":"Communication RS485 / Modbus cabling routed","completed":false},{"id":"chk-9-5","title":"Inverter body and surge protection double earthing verified","label":"Inverter body and surge protection double earthing verified","completed":false}]', '[]', '[]', '', '')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-1-stage-10', 'proj-1', 'meter_synchronisation', 'Meter Synchronisation & Discom Bi-Directional Meter', 10, 'Engineering & Liaisoning', 'Project Manager', 'emp-2', 'Amit Sharma', 'NOT STARTED', 'HIGH', NULL, NULL, NULL, '[{"id":"chk-10-1","title":"Discom Net Meter testing fee paid and laboratory report cleared","label":"Discom Net Meter testing fee paid and laboratory report cleared","completed":false},{"id":"chk-10-2","title":"Sub-division JE / AEE site joint inspection conducted","label":"Sub-division JE / AEE site joint inspection conducted","completed":false},{"id":"chk-10-3","title":"Bi-directional electronic trivector meter installed","label":"Bi-directional electronic trivector meter installed","completed":false},{"id":"chk-10-4","title":"Discom official seals applied on meter box and CT/PT","label":"Discom official seals applied on meter box and CT/PT","completed":false},{"id":"chk-10-5","title":"Net metering connectivity certificate issued by Discom","label":"Net metering connectivity certificate issued by Discom","completed":false}]', '[]', '[]', '', '')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-1-stage-11', 'proj-1', 'inverter_wifi_pairing', 'Inverter WiFi / 4G Dongle Pairing & Cloud Setup', 11, 'Service', 'Service Manager', 'emp-11', 'Rohit Verma', 'NOT STARTED', 'MEDIUM', NULL, NULL, NULL, '[{"id":"chk-11-1","title":"Inverter WiFi / 4G cellular datalogger dongle inserted","label":"Inverter WiFi / 4G cellular datalogger dongle inserted","completed":false},{"id":"chk-11-2","title":"Inverter connected to customer local WiFi / Cloud portal","label":"Inverter connected to customer local WiFi / Cloud portal","completed":false},{"id":"chk-11-3","title":"Cloud monitoring account registered for customer and ERP","label":"Cloud monitoring account registered for customer and ERP","completed":false},{"id":"chk-11-4","title":"Real-time telemetry generation verified on mobile app","label":"Real-time telemetry generation verified on mobile app","completed":false},{"id":"chk-11-5","title":"Auto alert rules configured for inverter faults and low yield","label":"Auto alert rules configured for inverter faults and low yield","completed":false}]', '[]', '[]', '', '')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-1-stage-12', 'proj-1', 'acdb_dcdb_fixing', 'ACDB + DCDB Fixing & Internal Wiring', 12, 'Electrical', 'Electrical Team', 'emp-8', 'Ankit Joshi', 'NOT STARTED', 'HIGH', NULL, NULL, NULL, '[{"id":"chk-12-1","title":"IP65 DCDB mounted with Type-II DC SPD and fuses","label":"IP65 DCDB mounted with Type-II DC SPD and fuses","completed":false},{"id":"chk-12-2","title":"IP65 ACDB mounted with 4-Pole MCCB and Type-II AC SPD","label":"IP65 ACDB mounted with 4-Pole MCCB and Type-II AC SPD","completed":false},{"id":"chk-12-3","title":"Internal busbar insulation and ferrule labeling","label":"Internal busbar insulation and ferrule labeling","completed":false},{"id":"chk-12-4","title":"Gland plate drilling and cable gland compression","label":"Gland plate drilling and cable gland compression","completed":false},{"id":"chk-12-5","title":"Earth continuity check across distribution boxes","label":"Earth continuity check across distribution boxes","completed":false}]', '[]', '[]', '', '')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-1-stage-13', 'proj-1', 'ac_side_electrical', 'AC Side Electrical Connection & LT Breaker Tapping', 13, 'Electrical', 'Electrical Team', 'emp-8', 'Ankit Joshi', 'NOT STARTED', 'HIGH', NULL, NULL, NULL, '[{"id":"chk-13-1","title":"Customer LT panel breaker capacity check","label":"Customer LT panel breaker capacity check","completed":false},{"id":"chk-13-2","title":"4-Core XLPE Armoured aluminium cable laying to LT panel","label":"4-Core XLPE Armoured aluminium cable laying to LT panel","completed":false},{"id":"chk-13-3","title":"Bi-directional generation meter CT installation","label":"Bi-directional generation meter CT installation","completed":false},{"id":"chk-13-4","title":"Isolation switch / lockable safety disconnect installed","label":"Isolation switch / lockable safety disconnect installed","completed":false},{"id":"chk-13-5","title":"Phase rotation (R-Y-B) sequence verified before breaker closing","label":"Phase rotation (R-Y-B) sequence verified before breaker closing","completed":false}]', '[]', '[]', '', '')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-1-stage-14', 'proj-1', 'final_verification', 'Final Verification & CEIG / Safety Inspection', 14, 'Operations', 'Project Manager', 'emp-2', 'Amit Sharma', 'NOT STARTED', 'HIGH', NULL, NULL, NULL, '[{"id":"chk-14-1","title":"Chief Electrical Inspector to Govt (CEIG) drawings and safety approval","label":"Chief Electrical Inspector to Govt (CEIG) drawings and safety approval","completed":false},{"id":"chk-14-2","title":"Insulation resistance (Megger) test on AC and DC circuits","label":"Insulation resistance (Megger) test on AC and DC circuits","completed":false},{"id":"chk-14-3","title":"Anti-islanding protection test (grid disconnect simulation)","label":"Anti-islanding protection test (grid disconnect simulation)","completed":false},{"id":"chk-14-4","title":"Thermal imaging survey for hotspots on modules and terminations","label":"Thermal imaging survey for hotspots on modules and terminations","completed":false},{"id":"chk-14-5","title":"Danger boards and statutory caution signs displayed","label":"Danger boards and statutory caution signs displayed","completed":false}]', '[]', '[]', '', '')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-1-stage-15', 'proj-1', 'final_handover', 'Final Handover & Commercial Commissioning', 15, 'Management', 'Project Manager', 'emp-2', 'Amit Sharma', 'NOT STARTED', 'HIGH', NULL, NULL, NULL, '[{"id":"chk-15-1","title":"Plant commissioning certificate signed with client","label":"Plant commissioning certificate signed with client","completed":false},{"id":"chk-15-2","title":"Final invoice submitted & final payment receipt acknowledged","label":"Final invoice submitted & final payment receipt acknowledged","completed":false},{"id":"chk-15-3","title":"25-year solar module performance warranty binder delivered","label":"25-year solar module performance warranty binder delivered","completed":false},{"id":"chk-15-4","title":"Inverter 5-year replacement warranty certificate delivered","label":"Inverter 5-year replacement warranty certificate delivered","completed":false},{"id":"chk-15-5","title":"Client maintenance training conducted","label":"Client maintenance training conducted","completed":false}]', '[]', '[]', '', '')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-1-stage-16', 'proj-1', 'service_amc', 'Service / AMC Handover', 16, 'Service', 'Service Manager', 'emp-11', 'Rohit Verma', 'NOT STARTED', 'MEDIUM', NULL, NULL, NULL, '[{"id":"chk-16-1","title":"Service contract activated in ERP","label":"Service contract activated in ERP","completed":false},{"id":"chk-16-2","title":"Annual maintenance visit calendar scheduled (Quarterly)","label":"Annual maintenance visit calendar scheduled (Quarterly)","completed":false},{"id":"chk-16-3","title":"Emergency breakdown helpline shared with client","label":"Emergency breakdown helpline shared with client","completed":false}]', '[]', '[]', '', '')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_projects` (`id`, `project_code`, `customer_id`, `customer_name`, `title`, `capacity_kw`, `total_value`, `status`, `current_stage_key`, `completion_percentage`, `project_manager_id`, `project_manager_name`, `site_address`, `city`, `inverter_model`, `panel_model`, `structure_type`, `start_date`, `expected_completion_date`, `notes`, `assignments_json`)
VALUES ('proj-2', 'SOL-2026-002', 'cust-2', 'Zenith Textiles Mills', '250 kW High Tension Rooftop Solar', 250, 11800000, 'CIVIL & STRUCTURE', 'structure_fabrication', 35, 'emp-2', 'Amit Sharma', 'Survey No. 118, NH-48, Sachin, Surat', 'Surat', '', '', 'Elevated GI Structure', '2026-08-15', '2026-10-05', 'Textile spinning mill rooftop. Structural load reinforcement underway.', '[]')
ON DUPLICATE KEY UPDATE `title` = VALUES(`title`), `status` = VALUES(`status`), `completion_percentage` = VALUES(`completion_percentage`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-2-stage-1', 'proj-2', 'site_survey', 'Site Survey', 1, 'Engineering', 'Site Survey Engineer', 'emp-3', 'Rajesh Kumar', 'COMPLETED', 'HIGH', '2026-08-12', '2026-08-15', '2026-08-15', '[{"id":"chk-1-1","title":"GPS coordinates & roof orientation verified","label":"GPS coordinates & roof orientation verified","completed":true,"completedAt":"2026-08-16","completedBy":"Rajesh Kumar"},{"id":"chk-1-2","title":"Shadow analysis & obstacle mapping","label":"Shadow analysis & obstacle mapping","completed":true,"completedAt":"2026-08-16","completedBy":"Rajesh Kumar"},{"id":"chk-1-3","title":"Electricity bill & sanctioned load audited","label":"Electricity bill & sanctioned load audited","completed":true,"completedAt":"2026-08-16","completedBy":"Rajesh Kumar"},{"id":"chk-1-4","title":"Structural load bearing & slab condition check","label":"Structural load bearing & slab condition check","completed":true,"completedAt":"2026-08-16","completedBy":"Rajesh Kumar"},{"id":"chk-1-5","title":"Cable routing distance to LT panel measured","label":"Cable routing distance to LT panel measured","completed":true,"completedAt":"2026-08-16","completedBy":"Rajesh Kumar"},{"id":"chk-1-6","title":"Site panoramic photos captured","label":"Site panoramic photos captured","completed":true,"completedAt":"2026-08-16","completedBy":"Rajesh Kumar"}]', '[{"id":"p-1","url":"https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&q=80&w=400","caption":"Rooftop South view prior to installation","type":"BEFORE","uploadedAt":"2026-08-14T11:40:00Z","uploadedBy":"Rajesh Kumar","gpsCoordinates":"22.9868, 72.3789"},{"id":"p-2","url":"https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?auto=format&fit=crop&q=80&w=400","caption":"LT panel room measurement inspection","type":"DURING","uploadedAt":"2026-08-14T12:00:00Z","uploadedBy":"Rajesh Kumar","gpsCoordinates":"22.9868, 72.3789"}]', '[{"id":"doc-1","name":"Site_Survey_Report_proj-2.pdf","url":"#","fileType":"pdf","sizeMb":2.8,"uploadedAt":"2026-08-14","uploadedBy":"Rajesh Kumar"}]', '', 'Amit Sharma (PM)')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-2-stage-2', 'proj-2', 'customer_confirmation', 'Customer Confirmation & Engineering Approval', 2, 'Sales & Engineering', 'Project Manager', 'emp-2', 'Amit Sharma', 'COMPLETED', 'HIGH', '2026-08-12', '2026-08-15', '2026-08-15', '[{"id":"chk-2-1","title":"3D Shadow Simulation & PVsyst report approved by client","label":"3D Shadow Simulation & PVsyst report approved by client","completed":true,"completedAt":"2026-08-16","completedBy":"Amit Sharma"},{"id":"chk-2-2","title":"Single Line Diagram (SLD) signed off","label":"Single Line Diagram (SLD) signed off","completed":true,"completedAt":"2026-08-16","completedBy":"Amit Sharma"},{"id":"chk-2-3","title":"Quotation & Payment milestone contract executed","label":"Quotation & Payment milestone contract executed","completed":true,"completedAt":"2026-08-16","completedBy":"Amit Sharma"},{"id":"chk-2-4","title":"Advance milestone payment confirmed","label":"Advance milestone payment confirmed","completed":true,"completedAt":"2026-08-16","completedBy":"Amit Sharma"},{"id":"chk-2-5","title":"BOM generation & procurement requisition raised","label":"BOM generation & procurement requisition raised","completed":true,"completedAt":"2026-08-16","completedBy":"Amit Sharma"}]', '[]', '[]', '', 'Amit Sharma (PM)')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-2-stage-3', 'proj-2', 'civil_work', 'Civil Work', 3, 'Civil', 'Civil Team', 'emp-3', 'Rajesh Kumar', 'COMPLETED', 'HIGH', '2026-08-12', '2026-08-15', '2026-08-15', '[{"id":"chk-3-1","title":"RCC foundation pedestal column layout marking","label":"RCC foundation pedestal column layout marking","completed":true,"completedAt":"2026-08-16","completedBy":"Rajesh Kumar"},{"id":"chk-3-2","title":"Anchor bolt drilling and chemical anchoring","label":"Anchor bolt drilling and chemical anchoring","completed":true,"completedAt":"2026-08-16","completedBy":"Rajesh Kumar"},{"id":"chk-3-3","title":"Casting of RCC pedestals with M25 concrete grade","label":"Casting of RCC pedestals with M25 concrete grade","completed":true,"completedAt":"2026-08-16","completedBy":"Rajesh Kumar"},{"id":"chk-3-4","title":"Curing period of 7 days completed","label":"Curing period of 7 days completed","completed":true,"completedAt":"2026-08-16","completedBy":"Rajesh Kumar"},{"id":"chk-3-5","title":"Waterproofing chemical coating around pedestals","label":"Waterproofing chemical coating around pedestals","completed":true,"completedAt":"2026-08-16","completedBy":"Rajesh Kumar"}]', '[{"id":"p-3","url":"https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&q=80&w=400","caption":"M25 RCC Pedestals with chemical waterproofing coat","type":"DURING","uploadedAt":"2026-08-20T16:00:00Z","uploadedBy":"Rajesh Kumar","gpsCoordinates":"22.9868, 72.3789"}]', '[]', '', 'Amit Sharma (PM)')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-2-stage-4', 'proj-2', 'structure_fabrication', 'Structure Installation & Fabrication', 4, 'Structure', 'Structure Team', 'emp-6', 'Dinesh Yadav', 'IN PROGRESS', 'HIGH', '2026-10-13', '2026-10-28', NULL, '[{"id":"chk-4-1","title":"Hot Dip Galvanized (HDG) steel column erection","label":"Hot Dip Galvanized (HDG) steel column erection","completed":false},{"id":"chk-4-2","title":"Rafters, purlins and bracing assembly","label":"Rafters, purlins and bracing assembly","completed":false},{"id":"chk-4-3","title":"Tilt angle verification with digital inclinometer (23° South)","label":"Tilt angle verification with digital inclinometer (23° South)","completed":false},{"id":"chk-4-4","title":"Torque tightening of high tensile grade 8.8 bolts","label":"Torque tightening of high tensile grade 8.8 bolts","completed":false},{"id":"chk-4-5","title":"Corrosion inspection and cold galvanizing spray applied","label":"Corrosion inspection and cold galvanizing spray applied","completed":false}]', '[]', '[]', '', '')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-2-stage-5', 'proj-2', 'lightning_arrestor', 'Lightning Arrestor (LA)', 5, 'Electrical', 'Electrical Team', 'emp-8', 'Ankit Joshi', 'NOT STARTED', 'MEDIUM', NULL, NULL, NULL, '[{"id":"chk-5-1","title":"ESE / Conventional Lightning Mast installation at highest peak","label":"ESE / Conventional Lightning Mast installation at highest peak","completed":false},{"id":"chk-5-2","title":"Dedicated 25x3 mm Copper / GI down conductor routing","label":"Dedicated 25x3 mm Copper / GI down conductor routing","completed":false},{"id":"chk-5-3","title":"Insulator standoff clamping at 1 meter intervals","label":"Insulator standoff clamping at 1 meter intervals","completed":false},{"id":"chk-5-4","title":"Direct path to designated LA earthing pit without bends","label":"Direct path to designated LA earthing pit without bends","completed":false},{"id":"chk-5-5","title":"Strike counter and test link mounted","label":"Strike counter and test link mounted","completed":false}]', '[]', '[]', '', '')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-2-stage-6', 'proj-2', 'cdc_earthing', 'CDC & Earthing Routing', 6, 'Electrical', 'Electrical Team', 'emp-8', 'Ankit Joshi', 'NOT STARTED', 'HIGH', NULL, NULL, NULL, '[{"id":"chk-6-1","title":"DC Cable trenching / UV-resistant conduit routing","label":"DC Cable trenching / UV-resistant conduit routing","completed":false},{"id":"chk-6-2","title":"Dual earthing of module mounting structure with 25x3 strip","label":"Dual earthing of module mounting structure with 25x3 strip","completed":false},{"id":"chk-6-3","title":"Perforated cable trays with covers installed","label":"Perforated cable trays with covers installed","completed":false},{"id":"chk-6-4","title":"Inverter chassis body earthing interconnection","label":"Inverter chassis body earthing interconnection","completed":false},{"id":"chk-6-5","title":"Bimetallic washers used on aluminium-copper transitions","label":"Bimetallic washers used on aluminium-copper transitions","completed":false}]', '[]', '[]', '', '')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-2-stage-7', 'proj-2', 'earthing_pits', 'Chemical Earthing Pits', 7, 'Electrical', 'Electrical Team', 'emp-8', 'Ankit Joshi', 'NOT STARTED', 'HIGH', NULL, NULL, NULL, '[{"id":"chk-7-1","title":"Boring of 3-meter deep chemical earthing pits (4 Nos)","label":"Boring of 3-meter deep chemical earthing pits (4 Nos)","completed":false},{"id":"chk-7-2","title":"Insertion of 50mm copper bonded / GI pipe electrode","label":"Insertion of 50mm copper bonded / GI pipe electrode","completed":false},{"id":"chk-7-3","title":"Backfilling with eco-friendly conductive compound (BFC)","label":"Backfilling with eco-friendly conductive compound (BFC)","completed":false},{"id":"chk-7-4","title":"Civil inspection chamber & heavy duty pit covers installed","label":"Civil inspection chamber & heavy duty pit covers installed","completed":false},{"id":"chk-7-5","title":"Earth resistance measurement with digital earth tester (< 2 Ohm)","label":"Earth resistance measurement with digital earth tester (< 2 Ohm)","completed":false}]', '[]', '[]', '', '')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-2-stage-8', 'proj-2', 'solar_installation', 'Solar Module Installation', 8, 'Installation', 'Installation Team', 'emp-7', 'Manoj Tiwari', 'NOT STARTED', 'HIGH', NULL, NULL, NULL, '[{"id":"chk-8-1","title":"Tier-1 Mono PERC Bifacial module inspection (zero micro-cracks)","label":"Tier-1 Mono PERC Bifacial module inspection (zero micro-cracks)","completed":false},{"id":"chk-8-2","title":"Module mounting with mid-clamps and end-clamps","label":"Module mounting with mid-clamps and end-clamps","completed":false},{"id":"chk-8-3","title":"MC4 connector crimping with professional ratchet tool","label":"MC4 connector crimping with professional ratchet tool","completed":false},{"id":"chk-8-4","title":"String Voc and Isc measurement with calibrated multimeter","label":"String Voc and Isc measurement with calibrated multimeter","completed":false},{"id":"chk-8-5","title":"String cable dressing and UV zip-tying under modules","label":"String cable dressing and UV zip-tying under modules","completed":false}]', '[]', '[]', '', '')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-2-stage-9', 'proj-2', 'inverter_installation', 'Inverter Installation', 9, 'Electrical', 'Electrical Team', 'emp-8', 'Ankit Joshi', 'NOT STARTED', 'HIGH', NULL, NULL, NULL, '[{"id":"chk-9-1","title":"Wall / canopy mounting in well-ventilated shaded location","label":"Wall / canopy mounting in well-ventilated shaded location","completed":false},{"id":"chk-9-2","title":"DC cable landing with fuse terminal blocks","label":"DC cable landing with fuse terminal blocks","completed":false},{"id":"chk-9-3","title":"AC output termination with heavy duty copper lugs","label":"AC output termination with heavy duty copper lugs","completed":false},{"id":"chk-9-4","title":"Communication RS485 / Modbus cabling routed","label":"Communication RS485 / Modbus cabling routed","completed":false},{"id":"chk-9-5","title":"Inverter body and surge protection double earthing verified","label":"Inverter body and surge protection double earthing verified","completed":false}]', '[]', '[]', '', '')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-2-stage-10', 'proj-2', 'meter_synchronisation', 'Meter Synchronisation & Discom Bi-Directional Meter', 10, 'Engineering & Liaisoning', 'Project Manager', 'emp-2', 'Amit Sharma', 'NOT STARTED', 'HIGH', NULL, NULL, NULL, '[{"id":"chk-10-1","title":"Discom Net Meter testing fee paid and laboratory report cleared","label":"Discom Net Meter testing fee paid and laboratory report cleared","completed":false},{"id":"chk-10-2","title":"Sub-division JE / AEE site joint inspection conducted","label":"Sub-division JE / AEE site joint inspection conducted","completed":false},{"id":"chk-10-3","title":"Bi-directional electronic trivector meter installed","label":"Bi-directional electronic trivector meter installed","completed":false},{"id":"chk-10-4","title":"Discom official seals applied on meter box and CT/PT","label":"Discom official seals applied on meter box and CT/PT","completed":false},{"id":"chk-10-5","title":"Net metering connectivity certificate issued by Discom","label":"Net metering connectivity certificate issued by Discom","completed":false}]', '[]', '[]', '', '')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-2-stage-11', 'proj-2', 'inverter_wifi_pairing', 'Inverter WiFi / 4G Dongle Pairing & Cloud Setup', 11, 'Service', 'Service Manager', 'emp-11', 'Rohit Verma', 'NOT STARTED', 'MEDIUM', NULL, NULL, NULL, '[{"id":"chk-11-1","title":"Inverter WiFi / 4G cellular datalogger dongle inserted","label":"Inverter WiFi / 4G cellular datalogger dongle inserted","completed":false},{"id":"chk-11-2","title":"Inverter connected to customer local WiFi / Cloud portal","label":"Inverter connected to customer local WiFi / Cloud portal","completed":false},{"id":"chk-11-3","title":"Cloud monitoring account registered for customer and ERP","label":"Cloud monitoring account registered for customer and ERP","completed":false},{"id":"chk-11-4","title":"Real-time telemetry generation verified on mobile app","label":"Real-time telemetry generation verified on mobile app","completed":false},{"id":"chk-11-5","title":"Auto alert rules configured for inverter faults and low yield","label":"Auto alert rules configured for inverter faults and low yield","completed":false}]', '[]', '[]', '', '')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-2-stage-12', 'proj-2', 'acdb_dcdb_fixing', 'ACDB + DCDB Fixing & Internal Wiring', 12, 'Electrical', 'Electrical Team', 'emp-8', 'Ankit Joshi', 'NOT STARTED', 'HIGH', NULL, NULL, NULL, '[{"id":"chk-12-1","title":"IP65 DCDB mounted with Type-II DC SPD and fuses","label":"IP65 DCDB mounted with Type-II DC SPD and fuses","completed":false},{"id":"chk-12-2","title":"IP65 ACDB mounted with 4-Pole MCCB and Type-II AC SPD","label":"IP65 ACDB mounted with 4-Pole MCCB and Type-II AC SPD","completed":false},{"id":"chk-12-3","title":"Internal busbar insulation and ferrule labeling","label":"Internal busbar insulation and ferrule labeling","completed":false},{"id":"chk-12-4","title":"Gland plate drilling and cable gland compression","label":"Gland plate drilling and cable gland compression","completed":false},{"id":"chk-12-5","title":"Earth continuity check across distribution boxes","label":"Earth continuity check across distribution boxes","completed":false}]', '[]', '[]', '', '')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-2-stage-13', 'proj-2', 'ac_side_electrical', 'AC Side Electrical Connection & LT Breaker Tapping', 13, 'Electrical', 'Electrical Team', 'emp-8', 'Ankit Joshi', 'NOT STARTED', 'HIGH', NULL, NULL, NULL, '[{"id":"chk-13-1","title":"Customer LT panel breaker capacity check","label":"Customer LT panel breaker capacity check","completed":false},{"id":"chk-13-2","title":"4-Core XLPE Armoured aluminium cable laying to LT panel","label":"4-Core XLPE Armoured aluminium cable laying to LT panel","completed":false},{"id":"chk-13-3","title":"Bi-directional generation meter CT installation","label":"Bi-directional generation meter CT installation","completed":false},{"id":"chk-13-4","title":"Isolation switch / lockable safety disconnect installed","label":"Isolation switch / lockable safety disconnect installed","completed":false},{"id":"chk-13-5","title":"Phase rotation (R-Y-B) sequence verified before breaker closing","label":"Phase rotation (R-Y-B) sequence verified before breaker closing","completed":false}]', '[]', '[]', '', '')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-2-stage-14', 'proj-2', 'final_verification', 'Final Verification & CEIG / Safety Inspection', 14, 'Operations', 'Project Manager', 'emp-2', 'Amit Sharma', 'NOT STARTED', 'HIGH', NULL, NULL, NULL, '[{"id":"chk-14-1","title":"Chief Electrical Inspector to Govt (CEIG) drawings and safety approval","label":"Chief Electrical Inspector to Govt (CEIG) drawings and safety approval","completed":false},{"id":"chk-14-2","title":"Insulation resistance (Megger) test on AC and DC circuits","label":"Insulation resistance (Megger) test on AC and DC circuits","completed":false},{"id":"chk-14-3","title":"Anti-islanding protection test (grid disconnect simulation)","label":"Anti-islanding protection test (grid disconnect simulation)","completed":false},{"id":"chk-14-4","title":"Thermal imaging survey for hotspots on modules and terminations","label":"Thermal imaging survey for hotspots on modules and terminations","completed":false},{"id":"chk-14-5","title":"Danger boards and statutory caution signs displayed","label":"Danger boards and statutory caution signs displayed","completed":false}]', '[]', '[]', '', '')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-2-stage-15', 'proj-2', 'final_handover', 'Final Handover & Commercial Commissioning', 15, 'Management', 'Project Manager', 'emp-2', 'Amit Sharma', 'NOT STARTED', 'HIGH', NULL, NULL, NULL, '[{"id":"chk-15-1","title":"Plant commissioning certificate signed with client","label":"Plant commissioning certificate signed with client","completed":false},{"id":"chk-15-2","title":"Final invoice submitted & final payment receipt acknowledged","label":"Final invoice submitted & final payment receipt acknowledged","completed":false},{"id":"chk-15-3","title":"25-year solar module performance warranty binder delivered","label":"25-year solar module performance warranty binder delivered","completed":false},{"id":"chk-15-4","title":"Inverter 5-year replacement warranty certificate delivered","label":"Inverter 5-year replacement warranty certificate delivered","completed":false},{"id":"chk-15-5","title":"Client maintenance training conducted","label":"Client maintenance training conducted","completed":false}]', '[]', '[]', '', '')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-2-stage-16', 'proj-2', 'service_amc', 'Service / AMC Handover', 16, 'Service', 'Service Manager', 'emp-11', 'Rohit Verma', 'NOT STARTED', 'MEDIUM', NULL, NULL, NULL, '[{"id":"chk-16-1","title":"Service contract activated in ERP","label":"Service contract activated in ERP","completed":false},{"id":"chk-16-2","title":"Annual maintenance visit calendar scheduled (Quarterly)","label":"Annual maintenance visit calendar scheduled (Quarterly)","completed":false},{"id":"chk-16-3","title":"Emergency breakdown helpline shared with client","label":"Emergency breakdown helpline shared with client","completed":false}]', '[]', '[]', '', '')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_projects` (`id`, `project_code`, `customer_id`, `customer_name`, `title`, `capacity_kw`, `total_value`, `status`, `current_stage_key`, `completion_percentage`, `project_manager_id`, `project_manager_name`, `site_address`, `city`, `inverter_model`, `panel_model`, `structure_type`, `start_date`, `expected_completion_date`, `notes`, `assignments_json`)
VALUES ('proj-3', 'SOL-2026-003', 'cust-3', 'Apex Super Specialty Hospital', '40 kW Hospital Solar & Emergency Backup Interlock', 40, 2150000, 'DESIGN & APPROVALS', 'customer_confirmation', 20, 'emp-2', 'Amit Sharma', 'Ring Road, Bodakdev, Ahmedabad', 'Ahmedabad', '', '', 'Elevated GI Structure', '2026-08-22', '2026-09-28', 'Hospital load requires zero export interlock until Discom meter arrives.', '[]')
ON DUPLICATE KEY UPDATE `title` = VALUES(`title`), `status` = VALUES(`status`), `completion_percentage` = VALUES(`completion_percentage`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-3-stage-1', 'proj-3', 'site_survey', 'Site Survey', 1, 'Engineering', 'Site Survey Engineer', 'emp-3', 'Rajesh Kumar', 'COMPLETED', 'HIGH', '2026-08-12', '2026-08-15', '2026-08-15', '[{"id":"chk-1-1","title":"GPS coordinates & roof orientation verified","label":"GPS coordinates & roof orientation verified","completed":true,"completedAt":"2026-08-16","completedBy":"Rajesh Kumar"},{"id":"chk-1-2","title":"Shadow analysis & obstacle mapping","label":"Shadow analysis & obstacle mapping","completed":true,"completedAt":"2026-08-16","completedBy":"Rajesh Kumar"},{"id":"chk-1-3","title":"Electricity bill & sanctioned load audited","label":"Electricity bill & sanctioned load audited","completed":true,"completedAt":"2026-08-16","completedBy":"Rajesh Kumar"},{"id":"chk-1-4","title":"Structural load bearing & slab condition check","label":"Structural load bearing & slab condition check","completed":true,"completedAt":"2026-08-16","completedBy":"Rajesh Kumar"},{"id":"chk-1-5","title":"Cable routing distance to LT panel measured","label":"Cable routing distance to LT panel measured","completed":true,"completedAt":"2026-08-16","completedBy":"Rajesh Kumar"},{"id":"chk-1-6","title":"Site panoramic photos captured","label":"Site panoramic photos captured","completed":true,"completedAt":"2026-08-16","completedBy":"Rajesh Kumar"}]', '[{"id":"p-1","url":"https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&q=80&w=400","caption":"Rooftop South view prior to installation","type":"BEFORE","uploadedAt":"2026-08-14T11:40:00Z","uploadedBy":"Rajesh Kumar","gpsCoordinates":"22.9868, 72.3789"},{"id":"p-2","url":"https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?auto=format&fit=crop&q=80&w=400","caption":"LT panel room measurement inspection","type":"DURING","uploadedAt":"2026-08-14T12:00:00Z","uploadedBy":"Rajesh Kumar","gpsCoordinates":"22.9868, 72.3789"}]', '[{"id":"doc-1","name":"Site_Survey_Report_proj-3.pdf","url":"#","fileType":"pdf","sizeMb":2.8,"uploadedAt":"2026-08-14","uploadedBy":"Rajesh Kumar"}]', '', 'Amit Sharma (PM)')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-3-stage-2', 'proj-3', 'customer_confirmation', 'Customer Confirmation & Engineering Approval', 2, 'Sales & Engineering', 'Project Manager', 'emp-2', 'Amit Sharma', 'IN PROGRESS', 'HIGH', '2026-10-13', '2026-10-18', NULL, '[{"id":"chk-2-1","title":"3D Shadow Simulation & PVsyst report approved by client","label":"3D Shadow Simulation & PVsyst report approved by client","completed":false},{"id":"chk-2-2","title":"Single Line Diagram (SLD) signed off","label":"Single Line Diagram (SLD) signed off","completed":false},{"id":"chk-2-3","title":"Quotation & Payment milestone contract executed","label":"Quotation & Payment milestone contract executed","completed":false},{"id":"chk-2-4","title":"Advance milestone payment confirmed","label":"Advance milestone payment confirmed","completed":false},{"id":"chk-2-5","title":"BOM generation & procurement requisition raised","label":"BOM generation & procurement requisition raised","completed":false}]', '[]', '[]', '', '')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-3-stage-3', 'proj-3', 'civil_work', 'Civil Work', 3, 'Civil', 'Civil Team', 'emp-3', 'Rajesh Kumar', 'NOT STARTED', 'HIGH', NULL, NULL, NULL, '[{"id":"chk-3-1","title":"RCC foundation pedestal column layout marking","label":"RCC foundation pedestal column layout marking","completed":false},{"id":"chk-3-2","title":"Anchor bolt drilling and chemical anchoring","label":"Anchor bolt drilling and chemical anchoring","completed":false},{"id":"chk-3-3","title":"Casting of RCC pedestals with M25 concrete grade","label":"Casting of RCC pedestals with M25 concrete grade","completed":false},{"id":"chk-3-4","title":"Curing period of 7 days completed","label":"Curing period of 7 days completed","completed":false},{"id":"chk-3-5","title":"Waterproofing chemical coating around pedestals","label":"Waterproofing chemical coating around pedestals","completed":false}]', '[]', '[]', '', '')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-3-stage-4', 'proj-3', 'structure_fabrication', 'Structure Installation & Fabrication', 4, 'Structure', 'Structure Team', 'emp-6', 'Dinesh Yadav', 'NOT STARTED', 'HIGH', NULL, NULL, NULL, '[{"id":"chk-4-1","title":"Hot Dip Galvanized (HDG) steel column erection","label":"Hot Dip Galvanized (HDG) steel column erection","completed":false},{"id":"chk-4-2","title":"Rafters, purlins and bracing assembly","label":"Rafters, purlins and bracing assembly","completed":false},{"id":"chk-4-3","title":"Tilt angle verification with digital inclinometer (23° South)","label":"Tilt angle verification with digital inclinometer (23° South)","completed":false},{"id":"chk-4-4","title":"Torque tightening of high tensile grade 8.8 bolts","label":"Torque tightening of high tensile grade 8.8 bolts","completed":false},{"id":"chk-4-5","title":"Corrosion inspection and cold galvanizing spray applied","label":"Corrosion inspection and cold galvanizing spray applied","completed":false}]', '[]', '[]', '', '')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-3-stage-5', 'proj-3', 'lightning_arrestor', 'Lightning Arrestor (LA)', 5, 'Electrical', 'Electrical Team', 'emp-8', 'Ankit Joshi', 'NOT STARTED', 'MEDIUM', NULL, NULL, NULL, '[{"id":"chk-5-1","title":"ESE / Conventional Lightning Mast installation at highest peak","label":"ESE / Conventional Lightning Mast installation at highest peak","completed":false},{"id":"chk-5-2","title":"Dedicated 25x3 mm Copper / GI down conductor routing","label":"Dedicated 25x3 mm Copper / GI down conductor routing","completed":false},{"id":"chk-5-3","title":"Insulator standoff clamping at 1 meter intervals","label":"Insulator standoff clamping at 1 meter intervals","completed":false},{"id":"chk-5-4","title":"Direct path to designated LA earthing pit without bends","label":"Direct path to designated LA earthing pit without bends","completed":false},{"id":"chk-5-5","title":"Strike counter and test link mounted","label":"Strike counter and test link mounted","completed":false}]', '[]', '[]', '', '')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-3-stage-6', 'proj-3', 'cdc_earthing', 'CDC & Earthing Routing', 6, 'Electrical', 'Electrical Team', 'emp-8', 'Ankit Joshi', 'NOT STARTED', 'HIGH', NULL, NULL, NULL, '[{"id":"chk-6-1","title":"DC Cable trenching / UV-resistant conduit routing","label":"DC Cable trenching / UV-resistant conduit routing","completed":false},{"id":"chk-6-2","title":"Dual earthing of module mounting structure with 25x3 strip","label":"Dual earthing of module mounting structure with 25x3 strip","completed":false},{"id":"chk-6-3","title":"Perforated cable trays with covers installed","label":"Perforated cable trays with covers installed","completed":false},{"id":"chk-6-4","title":"Inverter chassis body earthing interconnection","label":"Inverter chassis body earthing interconnection","completed":false},{"id":"chk-6-5","title":"Bimetallic washers used on aluminium-copper transitions","label":"Bimetallic washers used on aluminium-copper transitions","completed":false}]', '[]', '[]', '', '')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-3-stage-7', 'proj-3', 'earthing_pits', 'Chemical Earthing Pits', 7, 'Electrical', 'Electrical Team', 'emp-8', 'Ankit Joshi', 'NOT STARTED', 'HIGH', NULL, NULL, NULL, '[{"id":"chk-7-1","title":"Boring of 3-meter deep chemical earthing pits (4 Nos)","label":"Boring of 3-meter deep chemical earthing pits (4 Nos)","completed":false},{"id":"chk-7-2","title":"Insertion of 50mm copper bonded / GI pipe electrode","label":"Insertion of 50mm copper bonded / GI pipe electrode","completed":false},{"id":"chk-7-3","title":"Backfilling with eco-friendly conductive compound (BFC)","label":"Backfilling with eco-friendly conductive compound (BFC)","completed":false},{"id":"chk-7-4","title":"Civil inspection chamber & heavy duty pit covers installed","label":"Civil inspection chamber & heavy duty pit covers installed","completed":false},{"id":"chk-7-5","title":"Earth resistance measurement with digital earth tester (< 2 Ohm)","label":"Earth resistance measurement with digital earth tester (< 2 Ohm)","completed":false}]', '[]', '[]', '', '')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-3-stage-8', 'proj-3', 'solar_installation', 'Solar Module Installation', 8, 'Installation', 'Installation Team', 'emp-7', 'Manoj Tiwari', 'NOT STARTED', 'HIGH', NULL, NULL, NULL, '[{"id":"chk-8-1","title":"Tier-1 Mono PERC Bifacial module inspection (zero micro-cracks)","label":"Tier-1 Mono PERC Bifacial module inspection (zero micro-cracks)","completed":false},{"id":"chk-8-2","title":"Module mounting with mid-clamps and end-clamps","label":"Module mounting with mid-clamps and end-clamps","completed":false},{"id":"chk-8-3","title":"MC4 connector crimping with professional ratchet tool","label":"MC4 connector crimping with professional ratchet tool","completed":false},{"id":"chk-8-4","title":"String Voc and Isc measurement with calibrated multimeter","label":"String Voc and Isc measurement with calibrated multimeter","completed":false},{"id":"chk-8-5","title":"String cable dressing and UV zip-tying under modules","label":"String cable dressing and UV zip-tying under modules","completed":false}]', '[]', '[]', '', '')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-3-stage-9', 'proj-3', 'inverter_installation', 'Inverter Installation', 9, 'Electrical', 'Electrical Team', 'emp-8', 'Ankit Joshi', 'NOT STARTED', 'HIGH', NULL, NULL, NULL, '[{"id":"chk-9-1","title":"Wall / canopy mounting in well-ventilated shaded location","label":"Wall / canopy mounting in well-ventilated shaded location","completed":false},{"id":"chk-9-2","title":"DC cable landing with fuse terminal blocks","label":"DC cable landing with fuse terminal blocks","completed":false},{"id":"chk-9-3","title":"AC output termination with heavy duty copper lugs","label":"AC output termination with heavy duty copper lugs","completed":false},{"id":"chk-9-4","title":"Communication RS485 / Modbus cabling routed","label":"Communication RS485 / Modbus cabling routed","completed":false},{"id":"chk-9-5","title":"Inverter body and surge protection double earthing verified","label":"Inverter body and surge protection double earthing verified","completed":false}]', '[]', '[]', '', '')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-3-stage-10', 'proj-3', 'meter_synchronisation', 'Meter Synchronisation & Discom Bi-Directional Meter', 10, 'Engineering & Liaisoning', 'Project Manager', 'emp-2', 'Amit Sharma', 'NOT STARTED', 'HIGH', NULL, NULL, NULL, '[{"id":"chk-10-1","title":"Discom Net Meter testing fee paid and laboratory report cleared","label":"Discom Net Meter testing fee paid and laboratory report cleared","completed":false},{"id":"chk-10-2","title":"Sub-division JE / AEE site joint inspection conducted","label":"Sub-division JE / AEE site joint inspection conducted","completed":false},{"id":"chk-10-3","title":"Bi-directional electronic trivector meter installed","label":"Bi-directional electronic trivector meter installed","completed":false},{"id":"chk-10-4","title":"Discom official seals applied on meter box and CT/PT","label":"Discom official seals applied on meter box and CT/PT","completed":false},{"id":"chk-10-5","title":"Net metering connectivity certificate issued by Discom","label":"Net metering connectivity certificate issued by Discom","completed":false}]', '[]', '[]', '', '')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-3-stage-11', 'proj-3', 'inverter_wifi_pairing', 'Inverter WiFi / 4G Dongle Pairing & Cloud Setup', 11, 'Service', 'Service Manager', 'emp-11', 'Rohit Verma', 'NOT STARTED', 'MEDIUM', NULL, NULL, NULL, '[{"id":"chk-11-1","title":"Inverter WiFi / 4G cellular datalogger dongle inserted","label":"Inverter WiFi / 4G cellular datalogger dongle inserted","completed":false},{"id":"chk-11-2","title":"Inverter connected to customer local WiFi / Cloud portal","label":"Inverter connected to customer local WiFi / Cloud portal","completed":false},{"id":"chk-11-3","title":"Cloud monitoring account registered for customer and ERP","label":"Cloud monitoring account registered for customer and ERP","completed":false},{"id":"chk-11-4","title":"Real-time telemetry generation verified on mobile app","label":"Real-time telemetry generation verified on mobile app","completed":false},{"id":"chk-11-5","title":"Auto alert rules configured for inverter faults and low yield","label":"Auto alert rules configured for inverter faults and low yield","completed":false}]', '[]', '[]', '', '')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-3-stage-12', 'proj-3', 'acdb_dcdb_fixing', 'ACDB + DCDB Fixing & Internal Wiring', 12, 'Electrical', 'Electrical Team', 'emp-8', 'Ankit Joshi', 'NOT STARTED', 'HIGH', NULL, NULL, NULL, '[{"id":"chk-12-1","title":"IP65 DCDB mounted with Type-II DC SPD and fuses","label":"IP65 DCDB mounted with Type-II DC SPD and fuses","completed":false},{"id":"chk-12-2","title":"IP65 ACDB mounted with 4-Pole MCCB and Type-II AC SPD","label":"IP65 ACDB mounted with 4-Pole MCCB and Type-II AC SPD","completed":false},{"id":"chk-12-3","title":"Internal busbar insulation and ferrule labeling","label":"Internal busbar insulation and ferrule labeling","completed":false},{"id":"chk-12-4","title":"Gland plate drilling and cable gland compression","label":"Gland plate drilling and cable gland compression","completed":false},{"id":"chk-12-5","title":"Earth continuity check across distribution boxes","label":"Earth continuity check across distribution boxes","completed":false}]', '[]', '[]', '', '')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-3-stage-13', 'proj-3', 'ac_side_electrical', 'AC Side Electrical Connection & LT Breaker Tapping', 13, 'Electrical', 'Electrical Team', 'emp-8', 'Ankit Joshi', 'NOT STARTED', 'HIGH', NULL, NULL, NULL, '[{"id":"chk-13-1","title":"Customer LT panel breaker capacity check","label":"Customer LT panel breaker capacity check","completed":false},{"id":"chk-13-2","title":"4-Core XLPE Armoured aluminium cable laying to LT panel","label":"4-Core XLPE Armoured aluminium cable laying to LT panel","completed":false},{"id":"chk-13-3","title":"Bi-directional generation meter CT installation","label":"Bi-directional generation meter CT installation","completed":false},{"id":"chk-13-4","title":"Isolation switch / lockable safety disconnect installed","label":"Isolation switch / lockable safety disconnect installed","completed":false},{"id":"chk-13-5","title":"Phase rotation (R-Y-B) sequence verified before breaker closing","label":"Phase rotation (R-Y-B) sequence verified before breaker closing","completed":false}]', '[]', '[]', '', '')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-3-stage-14', 'proj-3', 'final_verification', 'Final Verification & CEIG / Safety Inspection', 14, 'Operations', 'Project Manager', 'emp-2', 'Amit Sharma', 'NOT STARTED', 'HIGH', NULL, NULL, NULL, '[{"id":"chk-14-1","title":"Chief Electrical Inspector to Govt (CEIG) drawings and safety approval","label":"Chief Electrical Inspector to Govt (CEIG) drawings and safety approval","completed":false},{"id":"chk-14-2","title":"Insulation resistance (Megger) test on AC and DC circuits","label":"Insulation resistance (Megger) test on AC and DC circuits","completed":false},{"id":"chk-14-3","title":"Anti-islanding protection test (grid disconnect simulation)","label":"Anti-islanding protection test (grid disconnect simulation)","completed":false},{"id":"chk-14-4","title":"Thermal imaging survey for hotspots on modules and terminations","label":"Thermal imaging survey for hotspots on modules and terminations","completed":false},{"id":"chk-14-5","title":"Danger boards and statutory caution signs displayed","label":"Danger boards and statutory caution signs displayed","completed":false}]', '[]', '[]', '', '')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-3-stage-15', 'proj-3', 'final_handover', 'Final Handover & Commercial Commissioning', 15, 'Management', 'Project Manager', 'emp-2', 'Amit Sharma', 'NOT STARTED', 'HIGH', NULL, NULL, NULL, '[{"id":"chk-15-1","title":"Plant commissioning certificate signed with client","label":"Plant commissioning certificate signed with client","completed":false},{"id":"chk-15-2","title":"Final invoice submitted & final payment receipt acknowledged","label":"Final invoice submitted & final payment receipt acknowledged","completed":false},{"id":"chk-15-3","title":"25-year solar module performance warranty binder delivered","label":"25-year solar module performance warranty binder delivered","completed":false},{"id":"chk-15-4","title":"Inverter 5-year replacement warranty certificate delivered","label":"Inverter 5-year replacement warranty certificate delivered","completed":false},{"id":"chk-15-5","title":"Client maintenance training conducted","label":"Client maintenance training conducted","completed":false}]', '[]', '[]', '', '')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-3-stage-16', 'proj-3', 'service_amc', 'Service / AMC Handover', 16, 'Service', 'Service Manager', 'emp-11', 'Rohit Verma', 'NOT STARTED', 'MEDIUM', NULL, NULL, NULL, '[{"id":"chk-16-1","title":"Service contract activated in ERP","label":"Service contract activated in ERP","completed":false},{"id":"chk-16-2","title":"Annual maintenance visit calendar scheduled (Quarterly)","label":"Annual maintenance visit calendar scheduled (Quarterly)","completed":false},{"id":"chk-16-3","title":"Emergency breakdown helpline shared with client","label":"Emergency breakdown helpline shared with client","completed":false}]', '[]', '[]', '', '')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_projects` (`id`, `project_code`, `customer_id`, `customer_name`, `title`, `capacity_kw`, `total_value`, `status`, `current_stage_key`, `completion_percentage`, `project_manager_id`, `project_manager_name`, `site_address`, `city`, `inverter_model`, `panel_model`, `structure_type`, `start_date`, `expected_completion_date`, `notes`, `assignments_json`)
VALUES ('proj-4', 'SOL-2026-004', 'cust-4', 'GreenTech Logistics Hub', '50 kW Warehouse Solar PV Plant', 50, 2600000, 'COMPLETED', 'service_amc', 100, 'emp-2', 'Amit Sharma', 'Warehousing Zone, Changodar, Ahmedabad', 'Ahmedabad', '', '', 'Elevated GI Structure', '2026-07-01', '2026-08-25', 'Commissioned on 29 Aug 2026. Generating ~220 units daily. Gold AMC active.', '[]')
ON DUPLICATE KEY UPDATE `title` = VALUES(`title`), `status` = VALUES(`status`), `completion_percentage` = VALUES(`completion_percentage`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-4-stage-1', 'proj-4', 'site_survey', 'Site Survey', 1, 'Engineering', 'Site Survey Engineer', 'emp-3', 'Rajesh Kumar', 'COMPLETED', 'HIGH', '2026-08-12', '2026-08-15', '2026-08-15', '[{"id":"chk-1-1","title":"GPS coordinates & roof orientation verified","label":"GPS coordinates & roof orientation verified","completed":true,"completedAt":"2026-08-16","completedBy":"Rajesh Kumar"},{"id":"chk-1-2","title":"Shadow analysis & obstacle mapping","label":"Shadow analysis & obstacle mapping","completed":true,"completedAt":"2026-08-16","completedBy":"Rajesh Kumar"},{"id":"chk-1-3","title":"Electricity bill & sanctioned load audited","label":"Electricity bill & sanctioned load audited","completed":true,"completedAt":"2026-08-16","completedBy":"Rajesh Kumar"},{"id":"chk-1-4","title":"Structural load bearing & slab condition check","label":"Structural load bearing & slab condition check","completed":true,"completedAt":"2026-08-16","completedBy":"Rajesh Kumar"},{"id":"chk-1-5","title":"Cable routing distance to LT panel measured","label":"Cable routing distance to LT panel measured","completed":true,"completedAt":"2026-08-16","completedBy":"Rajesh Kumar"},{"id":"chk-1-6","title":"Site panoramic photos captured","label":"Site panoramic photos captured","completed":true,"completedAt":"2026-08-16","completedBy":"Rajesh Kumar"}]', '[{"id":"p-1","url":"https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&q=80&w=400","caption":"Rooftop South view prior to installation","type":"BEFORE","uploadedAt":"2026-08-14T11:40:00Z","uploadedBy":"Rajesh Kumar","gpsCoordinates":"22.9868, 72.3789"},{"id":"p-2","url":"https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?auto=format&fit=crop&q=80&w=400","caption":"LT panel room measurement inspection","type":"DURING","uploadedAt":"2026-08-14T12:00:00Z","uploadedBy":"Rajesh Kumar","gpsCoordinates":"22.9868, 72.3789"}]', '[{"id":"doc-1","name":"Site_Survey_Report_proj-4.pdf","url":"#","fileType":"pdf","sizeMb":2.8,"uploadedAt":"2026-08-14","uploadedBy":"Rajesh Kumar"}]', '', 'Amit Sharma (PM)')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-4-stage-2', 'proj-4', 'customer_confirmation', 'Customer Confirmation & Engineering Approval', 2, 'Sales & Engineering', 'Project Manager', 'emp-2', 'Amit Sharma', 'COMPLETED', 'HIGH', '2026-08-12', '2026-08-15', '2026-08-15', '[{"id":"chk-2-1","title":"3D Shadow Simulation & PVsyst report approved by client","label":"3D Shadow Simulation & PVsyst report approved by client","completed":true,"completedAt":"2026-08-16","completedBy":"Amit Sharma"},{"id":"chk-2-2","title":"Single Line Diagram (SLD) signed off","label":"Single Line Diagram (SLD) signed off","completed":true,"completedAt":"2026-08-16","completedBy":"Amit Sharma"},{"id":"chk-2-3","title":"Quotation & Payment milestone contract executed","label":"Quotation & Payment milestone contract executed","completed":true,"completedAt":"2026-08-16","completedBy":"Amit Sharma"},{"id":"chk-2-4","title":"Advance milestone payment confirmed","label":"Advance milestone payment confirmed","completed":true,"completedAt":"2026-08-16","completedBy":"Amit Sharma"},{"id":"chk-2-5","title":"BOM generation & procurement requisition raised","label":"BOM generation & procurement requisition raised","completed":true,"completedAt":"2026-08-16","completedBy":"Amit Sharma"}]', '[]', '[]', '', 'Amit Sharma (PM)')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-4-stage-3', 'proj-4', 'civil_work', 'Civil Work', 3, 'Civil', 'Civil Team', 'emp-3', 'Rajesh Kumar', 'COMPLETED', 'HIGH', '2026-08-12', '2026-08-15', '2026-08-15', '[{"id":"chk-3-1","title":"RCC foundation pedestal column layout marking","label":"RCC foundation pedestal column layout marking","completed":true,"completedAt":"2026-08-16","completedBy":"Rajesh Kumar"},{"id":"chk-3-2","title":"Anchor bolt drilling and chemical anchoring","label":"Anchor bolt drilling and chemical anchoring","completed":true,"completedAt":"2026-08-16","completedBy":"Rajesh Kumar"},{"id":"chk-3-3","title":"Casting of RCC pedestals with M25 concrete grade","label":"Casting of RCC pedestals with M25 concrete grade","completed":true,"completedAt":"2026-08-16","completedBy":"Rajesh Kumar"},{"id":"chk-3-4","title":"Curing period of 7 days completed","label":"Curing period of 7 days completed","completed":true,"completedAt":"2026-08-16","completedBy":"Rajesh Kumar"},{"id":"chk-3-5","title":"Waterproofing chemical coating around pedestals","label":"Waterproofing chemical coating around pedestals","completed":true,"completedAt":"2026-08-16","completedBy":"Rajesh Kumar"}]', '[{"id":"p-3","url":"https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&q=80&w=400","caption":"M25 RCC Pedestals with chemical waterproofing coat","type":"DURING","uploadedAt":"2026-08-20T16:00:00Z","uploadedBy":"Rajesh Kumar","gpsCoordinates":"22.9868, 72.3789"}]', '[]', '', 'Amit Sharma (PM)')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-4-stage-4', 'proj-4', 'structure_fabrication', 'Structure Installation & Fabrication', 4, 'Structure', 'Structure Team', 'emp-6', 'Dinesh Yadav', 'COMPLETED', 'HIGH', '2026-08-12', '2026-08-15', '2026-08-15', '[{"id":"chk-4-1","title":"Hot Dip Galvanized (HDG) steel column erection","label":"Hot Dip Galvanized (HDG) steel column erection","completed":true,"completedAt":"2026-08-16","completedBy":"Dinesh Yadav"},{"id":"chk-4-2","title":"Rafters, purlins and bracing assembly","label":"Rafters, purlins and bracing assembly","completed":true,"completedAt":"2026-08-16","completedBy":"Dinesh Yadav"},{"id":"chk-4-3","title":"Tilt angle verification with digital inclinometer (23° South)","label":"Tilt angle verification with digital inclinometer (23° South)","completed":true,"completedAt":"2026-08-16","completedBy":"Dinesh Yadav"},{"id":"chk-4-4","title":"Torque tightening of high tensile grade 8.8 bolts","label":"Torque tightening of high tensile grade 8.8 bolts","completed":true,"completedAt":"2026-08-16","completedBy":"Dinesh Yadav"},{"id":"chk-4-5","title":"Corrosion inspection and cold galvanizing spray applied","label":"Corrosion inspection and cold galvanizing spray applied","completed":true,"completedAt":"2026-08-16","completedBy":"Dinesh Yadav"}]', '[{"id":"p-4","url":"https://images.unsplash.com/photo-1545208942-e1c9c916524b?auto=format&fit=crop&q=80&w=400","caption":"HDG 80 Micron elevated structure assembled","type":"DURING","uploadedAt":"2026-08-25T14:30:00Z","uploadedBy":"Dinesh Yadav","gpsCoordinates":"22.9868, 72.3789"}]', '[]', '', 'Amit Sharma (PM)')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-4-stage-5', 'proj-4', 'lightning_arrestor', 'Lightning Arrestor (LA)', 5, 'Electrical', 'Electrical Team', 'emp-8', 'Ankit Joshi', 'COMPLETED', 'MEDIUM', '2026-08-12', '2026-08-15', '2026-08-15', '[{"id":"chk-5-1","title":"ESE / Conventional Lightning Mast installation at highest peak","label":"ESE / Conventional Lightning Mast installation at highest peak","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"},{"id":"chk-5-2","title":"Dedicated 25x3 mm Copper / GI down conductor routing","label":"Dedicated 25x3 mm Copper / GI down conductor routing","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"},{"id":"chk-5-3","title":"Insulator standoff clamping at 1 meter intervals","label":"Insulator standoff clamping at 1 meter intervals","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"},{"id":"chk-5-4","title":"Direct path to designated LA earthing pit without bends","label":"Direct path to designated LA earthing pit without bends","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"},{"id":"chk-5-5","title":"Strike counter and test link mounted","label":"Strike counter and test link mounted","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"}]', '[]', '[]', '', 'Amit Sharma (PM)')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-4-stage-6', 'proj-4', 'cdc_earthing', 'CDC & Earthing Routing', 6, 'Electrical', 'Electrical Team', 'emp-8', 'Ankit Joshi', 'COMPLETED', 'HIGH', '2026-08-12', '2026-08-15', '2026-08-15', '[{"id":"chk-6-1","title":"DC Cable trenching / UV-resistant conduit routing","label":"DC Cable trenching / UV-resistant conduit routing","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"},{"id":"chk-6-2","title":"Dual earthing of module mounting structure with 25x3 strip","label":"Dual earthing of module mounting structure with 25x3 strip","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"},{"id":"chk-6-3","title":"Perforated cable trays with covers installed","label":"Perforated cable trays with covers installed","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"},{"id":"chk-6-4","title":"Inverter chassis body earthing interconnection","label":"Inverter chassis body earthing interconnection","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"},{"id":"chk-6-5","title":"Bimetallic washers used on aluminium-copper transitions","label":"Bimetallic washers used on aluminium-copper transitions","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"}]', '[]', '[]', '', 'Amit Sharma (PM)')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-4-stage-7', 'proj-4', 'earthing_pits', 'Chemical Earthing Pits', 7, 'Electrical', 'Electrical Team', 'emp-8', 'Ankit Joshi', 'COMPLETED', 'HIGH', '2026-08-12', '2026-08-15', '2026-08-15', '[{"id":"chk-7-1","title":"Boring of 3-meter deep chemical earthing pits (4 Nos)","label":"Boring of 3-meter deep chemical earthing pits (4 Nos)","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"},{"id":"chk-7-2","title":"Insertion of 50mm copper bonded / GI pipe electrode","label":"Insertion of 50mm copper bonded / GI pipe electrode","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"},{"id":"chk-7-3","title":"Backfilling with eco-friendly conductive compound (BFC)","label":"Backfilling with eco-friendly conductive compound (BFC)","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"},{"id":"chk-7-4","title":"Civil inspection chamber & heavy duty pit covers installed","label":"Civil inspection chamber & heavy duty pit covers installed","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"},{"id":"chk-7-5","title":"Earth resistance measurement with digital earth tester (< 2 Ohm)","label":"Earth resistance measurement with digital earth tester (< 2 Ohm)","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"}]', '[{"id":"p-5","url":"https://images.unsplash.com/photo-1559302504-64aae6ca6b6f?auto=format&fit=crop&q=80&w=400","caption":"Chemical earth pit chamber with digital resistance test","type":"AFTER","uploadedAt":"2026-08-30T17:00:00Z","uploadedBy":"Ankit Joshi","gpsCoordinates":"22.9868, 72.3789"}]', '[]', '', 'Amit Sharma (PM)')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-4-stage-8', 'proj-4', 'solar_installation', 'Solar Module Installation', 8, 'Installation', 'Installation Team', 'emp-7', 'Manoj Tiwari', 'COMPLETED', 'HIGH', '2026-08-12', '2026-08-15', '2026-08-15', '[{"id":"chk-8-1","title":"Tier-1 Mono PERC Bifacial module inspection (zero micro-cracks)","label":"Tier-1 Mono PERC Bifacial module inspection (zero micro-cracks)","completed":true,"completedAt":"2026-08-16","completedBy":"Manoj Tiwari"},{"id":"chk-8-2","title":"Module mounting with mid-clamps and end-clamps","label":"Module mounting with mid-clamps and end-clamps","completed":true,"completedAt":"2026-08-16","completedBy":"Manoj Tiwari"},{"id":"chk-8-3","title":"MC4 connector crimping with professional ratchet tool","label":"MC4 connector crimping with professional ratchet tool","completed":true,"completedAt":"2026-08-16","completedBy":"Manoj Tiwari"},{"id":"chk-8-4","title":"String Voc and Isc measurement with calibrated multimeter","label":"String Voc and Isc measurement with calibrated multimeter","completed":true,"completedAt":"2026-08-16","completedBy":"Manoj Tiwari"},{"id":"chk-8-5","title":"String cable dressing and UV zip-tying under modules","label":"String cable dressing and UV zip-tying under modules","completed":true,"completedAt":"2026-08-16","completedBy":"Manoj Tiwari"}]', '[{"id":"p-6","url":"https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&q=80&w=400","caption":"Solar panel string array mounting underway","type":"DURING","uploadedAt":"2026-09-03T11:15:00Z","uploadedBy":"Manoj Tiwari","gpsCoordinates":"22.9868, 72.3789"}]', '[]', '', 'Amit Sharma (PM)')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-4-stage-9', 'proj-4', 'inverter_installation', 'Inverter Installation', 9, 'Electrical', 'Electrical Team', 'emp-8', 'Ankit Joshi', 'COMPLETED', 'HIGH', '2026-08-12', '2026-08-15', '2026-08-15', '[{"id":"chk-9-1","title":"Wall / canopy mounting in well-ventilated shaded location","label":"Wall / canopy mounting in well-ventilated shaded location","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"},{"id":"chk-9-2","title":"DC cable landing with fuse terminal blocks","label":"DC cable landing with fuse terminal blocks","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"},{"id":"chk-9-3","title":"AC output termination with heavy duty copper lugs","label":"AC output termination with heavy duty copper lugs","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"},{"id":"chk-9-4","title":"Communication RS485 / Modbus cabling routed","label":"Communication RS485 / Modbus cabling routed","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"},{"id":"chk-9-5","title":"Inverter body and surge protection double earthing verified","label":"Inverter body and surge protection double earthing verified","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"}]', '[]', '[]', '', 'Amit Sharma (PM)')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-4-stage-10', 'proj-4', 'meter_synchronisation', 'Meter Synchronisation & Discom Bi-Directional Meter', 10, 'Engineering & Liaisoning', 'Project Manager', 'emp-2', 'Amit Sharma', 'COMPLETED', 'HIGH', '2026-08-12', '2026-08-15', '2026-08-15', '[{"id":"chk-10-1","title":"Discom Net Meter testing fee paid and laboratory report cleared","label":"Discom Net Meter testing fee paid and laboratory report cleared","completed":true,"completedAt":"2026-08-16","completedBy":"Amit Sharma"},{"id":"chk-10-2","title":"Sub-division JE / AEE site joint inspection conducted","label":"Sub-division JE / AEE site joint inspection conducted","completed":true,"completedAt":"2026-08-16","completedBy":"Amit Sharma"},{"id":"chk-10-3","title":"Bi-directional electronic trivector meter installed","label":"Bi-directional electronic trivector meter installed","completed":true,"completedAt":"2026-08-16","completedBy":"Amit Sharma"},{"id":"chk-10-4","title":"Discom official seals applied on meter box and CT/PT","label":"Discom official seals applied on meter box and CT/PT","completed":true,"completedAt":"2026-08-16","completedBy":"Amit Sharma"},{"id":"chk-10-5","title":"Net metering connectivity certificate issued by Discom","label":"Net metering connectivity certificate issued by Discom","completed":true,"completedAt":"2026-08-16","completedBy":"Amit Sharma"}]', '[]', '[]', '', 'Amit Sharma (PM)')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-4-stage-11', 'proj-4', 'inverter_wifi_pairing', 'Inverter WiFi / 4G Dongle Pairing & Cloud Setup', 11, 'Service', 'Service Manager', 'emp-11', 'Rohit Verma', 'COMPLETED', 'MEDIUM', '2026-08-12', '2026-08-15', '2026-08-15', '[{"id":"chk-11-1","title":"Inverter WiFi / 4G cellular datalogger dongle inserted","label":"Inverter WiFi / 4G cellular datalogger dongle inserted","completed":true,"completedAt":"2026-08-16","completedBy":"Rohit Verma"},{"id":"chk-11-2","title":"Inverter connected to customer local WiFi / Cloud portal","label":"Inverter connected to customer local WiFi / Cloud portal","completed":true,"completedAt":"2026-08-16","completedBy":"Rohit Verma"},{"id":"chk-11-3","title":"Cloud monitoring account registered for customer and ERP","label":"Cloud monitoring account registered for customer and ERP","completed":true,"completedAt":"2026-08-16","completedBy":"Rohit Verma"},{"id":"chk-11-4","title":"Real-time telemetry generation verified on mobile app","label":"Real-time telemetry generation verified on mobile app","completed":true,"completedAt":"2026-08-16","completedBy":"Rohit Verma"},{"id":"chk-11-5","title":"Auto alert rules configured for inverter faults and low yield","label":"Auto alert rules configured for inverter faults and low yield","completed":true,"completedAt":"2026-08-16","completedBy":"Rohit Verma"}]', '[]', '[]', '', 'Amit Sharma (PM)')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-4-stage-12', 'proj-4', 'acdb_dcdb_fixing', 'ACDB + DCDB Fixing & Internal Wiring', 12, 'Electrical', 'Electrical Team', 'emp-8', 'Ankit Joshi', 'COMPLETED', 'HIGH', '2026-08-12', '2026-08-15', '2026-08-15', '[{"id":"chk-12-1","title":"IP65 DCDB mounted with Type-II DC SPD and fuses","label":"IP65 DCDB mounted with Type-II DC SPD and fuses","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"},{"id":"chk-12-2","title":"IP65 ACDB mounted with 4-Pole MCCB and Type-II AC SPD","label":"IP65 ACDB mounted with 4-Pole MCCB and Type-II AC SPD","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"},{"id":"chk-12-3","title":"Internal busbar insulation and ferrule labeling","label":"Internal busbar insulation and ferrule labeling","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"},{"id":"chk-12-4","title":"Gland plate drilling and cable gland compression","label":"Gland plate drilling and cable gland compression","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"},{"id":"chk-12-5","title":"Earth continuity check across distribution boxes","label":"Earth continuity check across distribution boxes","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"}]', '[]', '[]', '', 'Amit Sharma (PM)')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-4-stage-13', 'proj-4', 'ac_side_electrical', 'AC Side Electrical Connection & LT Breaker Tapping', 13, 'Electrical', 'Electrical Team', 'emp-8', 'Ankit Joshi', 'COMPLETED', 'HIGH', '2026-08-12', '2026-08-15', '2026-08-15', '[{"id":"chk-13-1","title":"Customer LT panel breaker capacity check","label":"Customer LT panel breaker capacity check","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"},{"id":"chk-13-2","title":"4-Core XLPE Armoured aluminium cable laying to LT panel","label":"4-Core XLPE Armoured aluminium cable laying to LT panel","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"},{"id":"chk-13-3","title":"Bi-directional generation meter CT installation","label":"Bi-directional generation meter CT installation","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"},{"id":"chk-13-4","title":"Isolation switch / lockable safety disconnect installed","label":"Isolation switch / lockable safety disconnect installed","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"},{"id":"chk-13-5","title":"Phase rotation (R-Y-B) sequence verified before breaker closing","label":"Phase rotation (R-Y-B) sequence verified before breaker closing","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"}]', '[]', '[]', '', 'Amit Sharma (PM)')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-4-stage-14', 'proj-4', 'final_verification', 'Final Verification & CEIG / Safety Inspection', 14, 'Operations', 'Project Manager', 'emp-2', 'Amit Sharma', 'COMPLETED', 'HIGH', '2026-08-12', '2026-08-15', '2026-08-15', '[{"id":"chk-14-1","title":"Chief Electrical Inspector to Govt (CEIG) drawings and safety approval","label":"Chief Electrical Inspector to Govt (CEIG) drawings and safety approval","completed":true,"completedAt":"2026-08-16","completedBy":"Amit Sharma"},{"id":"chk-14-2","title":"Insulation resistance (Megger) test on AC and DC circuits","label":"Insulation resistance (Megger) test on AC and DC circuits","completed":true,"completedAt":"2026-08-16","completedBy":"Amit Sharma"},{"id":"chk-14-3","title":"Anti-islanding protection test (grid disconnect simulation)","label":"Anti-islanding protection test (grid disconnect simulation)","completed":true,"completedAt":"2026-08-16","completedBy":"Amit Sharma"},{"id":"chk-14-4","title":"Thermal imaging survey for hotspots on modules and terminations","label":"Thermal imaging survey for hotspots on modules and terminations","completed":true,"completedAt":"2026-08-16","completedBy":"Amit Sharma"},{"id":"chk-14-5","title":"Danger boards and statutory caution signs displayed","label":"Danger boards and statutory caution signs displayed","completed":true,"completedAt":"2026-08-16","completedBy":"Amit Sharma"}]', '[]', '[]', '', 'Amit Sharma (PM)')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-4-stage-15', 'proj-4', 'final_handover', 'Final Handover & Commercial Commissioning', 15, 'Management', 'Project Manager', 'emp-2', 'Amit Sharma', 'COMPLETED', 'HIGH', '2026-08-12', '2026-08-15', '2026-08-15', '[{"id":"chk-15-1","title":"Plant commissioning certificate signed with client","label":"Plant commissioning certificate signed with client","completed":true,"completedAt":"2026-08-16","completedBy":"Amit Sharma"},{"id":"chk-15-2","title":"Final invoice submitted & final payment receipt acknowledged","label":"Final invoice submitted & final payment receipt acknowledged","completed":true,"completedAt":"2026-08-16","completedBy":"Amit Sharma"},{"id":"chk-15-3","title":"25-year solar module performance warranty binder delivered","label":"25-year solar module performance warranty binder delivered","completed":true,"completedAt":"2026-08-16","completedBy":"Amit Sharma"},{"id":"chk-15-4","title":"Inverter 5-year replacement warranty certificate delivered","label":"Inverter 5-year replacement warranty certificate delivered","completed":true,"completedAt":"2026-08-16","completedBy":"Amit Sharma"},{"id":"chk-15-5","title":"Client maintenance training conducted","label":"Client maintenance training conducted","completed":true,"completedAt":"2026-08-16","completedBy":"Amit Sharma"}]', '[]', '[]', '', 'Amit Sharma (PM)')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-4-stage-16', 'proj-4', 'service_amc', 'Service / AMC Handover', 16, 'Service', 'Service Manager', 'emp-11', 'Rohit Verma', 'APPROVED', 'MEDIUM', '2026-08-12', '2026-08-15', '2026-08-15', '[{"id":"chk-16-1","title":"Service contract activated in ERP","label":"Service contract activated in ERP","completed":true,"completedAt":"2026-08-16","completedBy":"Rohit Verma"},{"id":"chk-16-2","title":"Annual maintenance visit calendar scheduled (Quarterly)","label":"Annual maintenance visit calendar scheduled (Quarterly)","completed":true,"completedAt":"2026-08-16","completedBy":"Rohit Verma"},{"id":"chk-16-3","title":"Emergency breakdown helpline shared with client","label":"Emergency breakdown helpline shared with client","completed":true,"completedAt":"2026-08-16","completedBy":"Rohit Verma"}]', '[]', '[]', '', 'Amit Sharma (PM)')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_projects` (`id`, `project_code`, `customer_id`, `customer_name`, `title`, `capacity_kw`, `total_value`, `status`, `current_stage_key`, `completion_percentage`, `project_manager_id`, `project_manager_name`, `site_address`, `city`, `inverter_model`, `panel_model`, `structure_type`, `start_date`, `expected_completion_date`, `notes`, `assignments_json`)
VALUES ('proj-5', 'SOL-2026-005', 'cust-5', 'Sunrise Cold Storage & Agro', '75 kW Cold Storage Solar PV Plant', 75, 3950000, 'DELAYED', 'meter_synchronisation', 58, 'emp-2', 'Amit Sharma', 'Mahuva Highway, Talaja Road, Bhavnagar', 'Bhavnagar', '', '', 'Elevated GI Structure', '2026-07-10', '2026-08-30', 'Delayed due to Discom bi-directional meter test certificate backlog at sub-division.', '[]')
ON DUPLICATE KEY UPDATE `title` = VALUES(`title`), `status` = VALUES(`status`), `completion_percentage` = VALUES(`completion_percentage`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-5-stage-1', 'proj-5', 'site_survey', 'Site Survey', 1, 'Engineering', 'Site Survey Engineer', 'emp-3', 'Rajesh Kumar', 'COMPLETED', 'HIGH', '2026-08-12', '2026-08-15', '2026-08-15', '[{"id":"chk-1-1","title":"GPS coordinates & roof orientation verified","label":"GPS coordinates & roof orientation verified","completed":true,"completedAt":"2026-08-16","completedBy":"Rajesh Kumar"},{"id":"chk-1-2","title":"Shadow analysis & obstacle mapping","label":"Shadow analysis & obstacle mapping","completed":true,"completedAt":"2026-08-16","completedBy":"Rajesh Kumar"},{"id":"chk-1-3","title":"Electricity bill & sanctioned load audited","label":"Electricity bill & sanctioned load audited","completed":true,"completedAt":"2026-08-16","completedBy":"Rajesh Kumar"},{"id":"chk-1-4","title":"Structural load bearing & slab condition check","label":"Structural load bearing & slab condition check","completed":true,"completedAt":"2026-08-16","completedBy":"Rajesh Kumar"},{"id":"chk-1-5","title":"Cable routing distance to LT panel measured","label":"Cable routing distance to LT panel measured","completed":true,"completedAt":"2026-08-16","completedBy":"Rajesh Kumar"},{"id":"chk-1-6","title":"Site panoramic photos captured","label":"Site panoramic photos captured","completed":true,"completedAt":"2026-08-16","completedBy":"Rajesh Kumar"}]', '[{"id":"p-1","url":"https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&q=80&w=400","caption":"Rooftop South view prior to installation","type":"BEFORE","uploadedAt":"2026-08-14T11:40:00Z","uploadedBy":"Rajesh Kumar","gpsCoordinates":"22.9868, 72.3789"},{"id":"p-2","url":"https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?auto=format&fit=crop&q=80&w=400","caption":"LT panel room measurement inspection","type":"DURING","uploadedAt":"2026-08-14T12:00:00Z","uploadedBy":"Rajesh Kumar","gpsCoordinates":"22.9868, 72.3789"}]', '[{"id":"doc-1","name":"Site_Survey_Report_proj-5.pdf","url":"#","fileType":"pdf","sizeMb":2.8,"uploadedAt":"2026-08-14","uploadedBy":"Rajesh Kumar"}]', '', 'Amit Sharma (PM)')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-5-stage-2', 'proj-5', 'customer_confirmation', 'Customer Confirmation & Engineering Approval', 2, 'Sales & Engineering', 'Project Manager', 'emp-2', 'Amit Sharma', 'COMPLETED', 'HIGH', '2026-08-12', '2026-08-15', '2026-08-15', '[{"id":"chk-2-1","title":"3D Shadow Simulation & PVsyst report approved by client","label":"3D Shadow Simulation & PVsyst report approved by client","completed":true,"completedAt":"2026-08-16","completedBy":"Amit Sharma"},{"id":"chk-2-2","title":"Single Line Diagram (SLD) signed off","label":"Single Line Diagram (SLD) signed off","completed":true,"completedAt":"2026-08-16","completedBy":"Amit Sharma"},{"id":"chk-2-3","title":"Quotation & Payment milestone contract executed","label":"Quotation & Payment milestone contract executed","completed":true,"completedAt":"2026-08-16","completedBy":"Amit Sharma"},{"id":"chk-2-4","title":"Advance milestone payment confirmed","label":"Advance milestone payment confirmed","completed":true,"completedAt":"2026-08-16","completedBy":"Amit Sharma"},{"id":"chk-2-5","title":"BOM generation & procurement requisition raised","label":"BOM generation & procurement requisition raised","completed":true,"completedAt":"2026-08-16","completedBy":"Amit Sharma"}]', '[]', '[]', '', 'Amit Sharma (PM)')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-5-stage-3', 'proj-5', 'civil_work', 'Civil Work', 3, 'Civil', 'Civil Team', 'emp-3', 'Rajesh Kumar', 'COMPLETED', 'HIGH', '2026-08-12', '2026-08-15', '2026-08-15', '[{"id":"chk-3-1","title":"RCC foundation pedestal column layout marking","label":"RCC foundation pedestal column layout marking","completed":true,"completedAt":"2026-08-16","completedBy":"Rajesh Kumar"},{"id":"chk-3-2","title":"Anchor bolt drilling and chemical anchoring","label":"Anchor bolt drilling and chemical anchoring","completed":true,"completedAt":"2026-08-16","completedBy":"Rajesh Kumar"},{"id":"chk-3-3","title":"Casting of RCC pedestals with M25 concrete grade","label":"Casting of RCC pedestals with M25 concrete grade","completed":true,"completedAt":"2026-08-16","completedBy":"Rajesh Kumar"},{"id":"chk-3-4","title":"Curing period of 7 days completed","label":"Curing period of 7 days completed","completed":true,"completedAt":"2026-08-16","completedBy":"Rajesh Kumar"},{"id":"chk-3-5","title":"Waterproofing chemical coating around pedestals","label":"Waterproofing chemical coating around pedestals","completed":true,"completedAt":"2026-08-16","completedBy":"Rajesh Kumar"}]', '[{"id":"p-3","url":"https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&q=80&w=400","caption":"M25 RCC Pedestals with chemical waterproofing coat","type":"DURING","uploadedAt":"2026-08-20T16:00:00Z","uploadedBy":"Rajesh Kumar","gpsCoordinates":"22.9868, 72.3789"}]', '[]', '', 'Amit Sharma (PM)')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-5-stage-4', 'proj-5', 'structure_fabrication', 'Structure Installation & Fabrication', 4, 'Structure', 'Structure Team', 'emp-6', 'Dinesh Yadav', 'COMPLETED', 'HIGH', '2026-08-12', '2026-08-15', '2026-08-15', '[{"id":"chk-4-1","title":"Hot Dip Galvanized (HDG) steel column erection","label":"Hot Dip Galvanized (HDG) steel column erection","completed":true,"completedAt":"2026-08-16","completedBy":"Dinesh Yadav"},{"id":"chk-4-2","title":"Rafters, purlins and bracing assembly","label":"Rafters, purlins and bracing assembly","completed":true,"completedAt":"2026-08-16","completedBy":"Dinesh Yadav"},{"id":"chk-4-3","title":"Tilt angle verification with digital inclinometer (23° South)","label":"Tilt angle verification with digital inclinometer (23° South)","completed":true,"completedAt":"2026-08-16","completedBy":"Dinesh Yadav"},{"id":"chk-4-4","title":"Torque tightening of high tensile grade 8.8 bolts","label":"Torque tightening of high tensile grade 8.8 bolts","completed":true,"completedAt":"2026-08-16","completedBy":"Dinesh Yadav"},{"id":"chk-4-5","title":"Corrosion inspection and cold galvanizing spray applied","label":"Corrosion inspection and cold galvanizing spray applied","completed":true,"completedAt":"2026-08-16","completedBy":"Dinesh Yadav"}]', '[{"id":"p-4","url":"https://images.unsplash.com/photo-1545208942-e1c9c916524b?auto=format&fit=crop&q=80&w=400","caption":"HDG 80 Micron elevated structure assembled","type":"DURING","uploadedAt":"2026-08-25T14:30:00Z","uploadedBy":"Dinesh Yadav","gpsCoordinates":"22.9868, 72.3789"}]', '[]', '', 'Amit Sharma (PM)')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-5-stage-5', 'proj-5', 'lightning_arrestor', 'Lightning Arrestor (LA)', 5, 'Electrical', 'Electrical Team', 'emp-8', 'Ankit Joshi', 'COMPLETED', 'MEDIUM', '2026-08-12', '2026-08-15', '2026-08-15', '[{"id":"chk-5-1","title":"ESE / Conventional Lightning Mast installation at highest peak","label":"ESE / Conventional Lightning Mast installation at highest peak","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"},{"id":"chk-5-2","title":"Dedicated 25x3 mm Copper / GI down conductor routing","label":"Dedicated 25x3 mm Copper / GI down conductor routing","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"},{"id":"chk-5-3","title":"Insulator standoff clamping at 1 meter intervals","label":"Insulator standoff clamping at 1 meter intervals","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"},{"id":"chk-5-4","title":"Direct path to designated LA earthing pit without bends","label":"Direct path to designated LA earthing pit without bends","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"},{"id":"chk-5-5","title":"Strike counter and test link mounted","label":"Strike counter and test link mounted","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"}]', '[]', '[]', '', 'Amit Sharma (PM)')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-5-stage-6', 'proj-5', 'cdc_earthing', 'CDC & Earthing Routing', 6, 'Electrical', 'Electrical Team', 'emp-8', 'Ankit Joshi', 'COMPLETED', 'HIGH', '2026-08-12', '2026-08-15', '2026-08-15', '[{"id":"chk-6-1","title":"DC Cable trenching / UV-resistant conduit routing","label":"DC Cable trenching / UV-resistant conduit routing","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"},{"id":"chk-6-2","title":"Dual earthing of module mounting structure with 25x3 strip","label":"Dual earthing of module mounting structure with 25x3 strip","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"},{"id":"chk-6-3","title":"Perforated cable trays with covers installed","label":"Perforated cable trays with covers installed","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"},{"id":"chk-6-4","title":"Inverter chassis body earthing interconnection","label":"Inverter chassis body earthing interconnection","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"},{"id":"chk-6-5","title":"Bimetallic washers used on aluminium-copper transitions","label":"Bimetallic washers used on aluminium-copper transitions","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"}]', '[]', '[]', '', 'Amit Sharma (PM)')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-5-stage-7', 'proj-5', 'earthing_pits', 'Chemical Earthing Pits', 7, 'Electrical', 'Electrical Team', 'emp-8', 'Ankit Joshi', 'COMPLETED', 'HIGH', '2026-08-12', '2026-08-15', '2026-08-15', '[{"id":"chk-7-1","title":"Boring of 3-meter deep chemical earthing pits (4 Nos)","label":"Boring of 3-meter deep chemical earthing pits (4 Nos)","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"},{"id":"chk-7-2","title":"Insertion of 50mm copper bonded / GI pipe electrode","label":"Insertion of 50mm copper bonded / GI pipe electrode","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"},{"id":"chk-7-3","title":"Backfilling with eco-friendly conductive compound (BFC)","label":"Backfilling with eco-friendly conductive compound (BFC)","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"},{"id":"chk-7-4","title":"Civil inspection chamber & heavy duty pit covers installed","label":"Civil inspection chamber & heavy duty pit covers installed","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"},{"id":"chk-7-5","title":"Earth resistance measurement with digital earth tester (< 2 Ohm)","label":"Earth resistance measurement with digital earth tester (< 2 Ohm)","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"}]', '[{"id":"p-5","url":"https://images.unsplash.com/photo-1559302504-64aae6ca6b6f?auto=format&fit=crop&q=80&w=400","caption":"Chemical earth pit chamber with digital resistance test","type":"AFTER","uploadedAt":"2026-08-30T17:00:00Z","uploadedBy":"Ankit Joshi","gpsCoordinates":"22.9868, 72.3789"}]', '[]', '', 'Amit Sharma (PM)')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-5-stage-8', 'proj-5', 'solar_installation', 'Solar Module Installation', 8, 'Installation', 'Installation Team', 'emp-7', 'Manoj Tiwari', 'COMPLETED', 'HIGH', '2026-08-12', '2026-08-15', '2026-08-15', '[{"id":"chk-8-1","title":"Tier-1 Mono PERC Bifacial module inspection (zero micro-cracks)","label":"Tier-1 Mono PERC Bifacial module inspection (zero micro-cracks)","completed":true,"completedAt":"2026-08-16","completedBy":"Manoj Tiwari"},{"id":"chk-8-2","title":"Module mounting with mid-clamps and end-clamps","label":"Module mounting with mid-clamps and end-clamps","completed":true,"completedAt":"2026-08-16","completedBy":"Manoj Tiwari"},{"id":"chk-8-3","title":"MC4 connector crimping with professional ratchet tool","label":"MC4 connector crimping with professional ratchet tool","completed":true,"completedAt":"2026-08-16","completedBy":"Manoj Tiwari"},{"id":"chk-8-4","title":"String Voc and Isc measurement with calibrated multimeter","label":"String Voc and Isc measurement with calibrated multimeter","completed":true,"completedAt":"2026-08-16","completedBy":"Manoj Tiwari"},{"id":"chk-8-5","title":"String cable dressing and UV zip-tying under modules","label":"String cable dressing and UV zip-tying under modules","completed":true,"completedAt":"2026-08-16","completedBy":"Manoj Tiwari"}]', '[{"id":"p-6","url":"https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&q=80&w=400","caption":"Solar panel string array mounting underway","type":"DURING","uploadedAt":"2026-09-03T11:15:00Z","uploadedBy":"Manoj Tiwari","gpsCoordinates":"22.9868, 72.3789"}]', '[]', '', 'Amit Sharma (PM)')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-5-stage-9', 'proj-5', 'inverter_installation', 'Inverter Installation', 9, 'Electrical', 'Electrical Team', 'emp-8', 'Ankit Joshi', 'COMPLETED', 'HIGH', '2026-08-12', '2026-08-15', '2026-08-15', '[{"id":"chk-9-1","title":"Wall / canopy mounting in well-ventilated shaded location","label":"Wall / canopy mounting in well-ventilated shaded location","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"},{"id":"chk-9-2","title":"DC cable landing with fuse terminal blocks","label":"DC cable landing with fuse terminal blocks","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"},{"id":"chk-9-3","title":"AC output termination with heavy duty copper lugs","label":"AC output termination with heavy duty copper lugs","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"},{"id":"chk-9-4","title":"Communication RS485 / Modbus cabling routed","label":"Communication RS485 / Modbus cabling routed","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"},{"id":"chk-9-5","title":"Inverter body and surge protection double earthing verified","label":"Inverter body and surge protection double earthing verified","completed":true,"completedAt":"2026-08-16","completedBy":"Ankit Joshi"}]', '[]', '[]', '', 'Amit Sharma (PM)')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-5-stage-10', 'proj-5', 'meter_synchronisation', 'Meter Synchronisation & Discom Bi-Directional Meter', 10, 'Engineering & Liaisoning', 'Project Manager', 'emp-2', 'Amit Sharma', 'OVERDUE', 'HIGH', '2026-10-13', '2026-11-17', NULL, '[{"id":"chk-10-1","title":"Discom Net Meter testing fee paid and laboratory report cleared","label":"Discom Net Meter testing fee paid and laboratory report cleared","completed":false},{"id":"chk-10-2","title":"Sub-division JE / AEE site joint inspection conducted","label":"Sub-division JE / AEE site joint inspection conducted","completed":false},{"id":"chk-10-3","title":"Bi-directional electronic trivector meter installed","label":"Bi-directional electronic trivector meter installed","completed":false},{"id":"chk-10-4","title":"Discom official seals applied on meter box and CT/PT","label":"Discom official seals applied on meter box and CT/PT","completed":false},{"id":"chk-10-5","title":"Net metering connectivity certificate issued by Discom","label":"Net metering connectivity certificate issued by Discom","completed":false}]', '[]', '[]', '', '')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-5-stage-11', 'proj-5', 'inverter_wifi_pairing', 'Inverter WiFi / 4G Dongle Pairing & Cloud Setup', 11, 'Service', 'Service Manager', 'emp-11', 'Rohit Verma', 'NOT STARTED', 'MEDIUM', NULL, NULL, NULL, '[{"id":"chk-11-1","title":"Inverter WiFi / 4G cellular datalogger dongle inserted","label":"Inverter WiFi / 4G cellular datalogger dongle inserted","completed":false},{"id":"chk-11-2","title":"Inverter connected to customer local WiFi / Cloud portal","label":"Inverter connected to customer local WiFi / Cloud portal","completed":false},{"id":"chk-11-3","title":"Cloud monitoring account registered for customer and ERP","label":"Cloud monitoring account registered for customer and ERP","completed":false},{"id":"chk-11-4","title":"Real-time telemetry generation verified on mobile app","label":"Real-time telemetry generation verified on mobile app","completed":false},{"id":"chk-11-5","title":"Auto alert rules configured for inverter faults and low yield","label":"Auto alert rules configured for inverter faults and low yield","completed":false}]', '[]', '[]', '', '')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-5-stage-12', 'proj-5', 'acdb_dcdb_fixing', 'ACDB + DCDB Fixing & Internal Wiring', 12, 'Electrical', 'Electrical Team', 'emp-8', 'Ankit Joshi', 'NOT STARTED', 'HIGH', NULL, NULL, NULL, '[{"id":"chk-12-1","title":"IP65 DCDB mounted with Type-II DC SPD and fuses","label":"IP65 DCDB mounted with Type-II DC SPD and fuses","completed":false},{"id":"chk-12-2","title":"IP65 ACDB mounted with 4-Pole MCCB and Type-II AC SPD","label":"IP65 ACDB mounted with 4-Pole MCCB and Type-II AC SPD","completed":false},{"id":"chk-12-3","title":"Internal busbar insulation and ferrule labeling","label":"Internal busbar insulation and ferrule labeling","completed":false},{"id":"chk-12-4","title":"Gland plate drilling and cable gland compression","label":"Gland plate drilling and cable gland compression","completed":false},{"id":"chk-12-5","title":"Earth continuity check across distribution boxes","label":"Earth continuity check across distribution boxes","completed":false}]', '[]', '[]', '', '')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-5-stage-13', 'proj-5', 'ac_side_electrical', 'AC Side Electrical Connection & LT Breaker Tapping', 13, 'Electrical', 'Electrical Team', 'emp-8', 'Ankit Joshi', 'NOT STARTED', 'HIGH', NULL, NULL, NULL, '[{"id":"chk-13-1","title":"Customer LT panel breaker capacity check","label":"Customer LT panel breaker capacity check","completed":false},{"id":"chk-13-2","title":"4-Core XLPE Armoured aluminium cable laying to LT panel","label":"4-Core XLPE Armoured aluminium cable laying to LT panel","completed":false},{"id":"chk-13-3","title":"Bi-directional generation meter CT installation","label":"Bi-directional generation meter CT installation","completed":false},{"id":"chk-13-4","title":"Isolation switch / lockable safety disconnect installed","label":"Isolation switch / lockable safety disconnect installed","completed":false},{"id":"chk-13-5","title":"Phase rotation (R-Y-B) sequence verified before breaker closing","label":"Phase rotation (R-Y-B) sequence verified before breaker closing","completed":false}]', '[]', '[]', '', '')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-5-stage-14', 'proj-5', 'final_verification', 'Final Verification & CEIG / Safety Inspection', 14, 'Operations', 'Project Manager', 'emp-2', 'Amit Sharma', 'NOT STARTED', 'HIGH', NULL, NULL, NULL, '[{"id":"chk-14-1","title":"Chief Electrical Inspector to Govt (CEIG) drawings and safety approval","label":"Chief Electrical Inspector to Govt (CEIG) drawings and safety approval","completed":false},{"id":"chk-14-2","title":"Insulation resistance (Megger) test on AC and DC circuits","label":"Insulation resistance (Megger) test on AC and DC circuits","completed":false},{"id":"chk-14-3","title":"Anti-islanding protection test (grid disconnect simulation)","label":"Anti-islanding protection test (grid disconnect simulation)","completed":false},{"id":"chk-14-4","title":"Thermal imaging survey for hotspots on modules and terminations","label":"Thermal imaging survey for hotspots on modules and terminations","completed":false},{"id":"chk-14-5","title":"Danger boards and statutory caution signs displayed","label":"Danger boards and statutory caution signs displayed","completed":false}]', '[]', '[]', '', '')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-5-stage-15', 'proj-5', 'final_handover', 'Final Handover & Commercial Commissioning', 15, 'Management', 'Project Manager', 'emp-2', 'Amit Sharma', 'NOT STARTED', 'HIGH', NULL, NULL, NULL, '[{"id":"chk-15-1","title":"Plant commissioning certificate signed with client","label":"Plant commissioning certificate signed with client","completed":false},{"id":"chk-15-2","title":"Final invoice submitted & final payment receipt acknowledged","label":"Final invoice submitted & final payment receipt acknowledged","completed":false},{"id":"chk-15-3","title":"25-year solar module performance warranty binder delivered","label":"25-year solar module performance warranty binder delivered","completed":false},{"id":"chk-15-4","title":"Inverter 5-year replacement warranty certificate delivered","label":"Inverter 5-year replacement warranty certificate delivered","completed":false},{"id":"chk-15-5","title":"Client maintenance training conducted","label":"Client maintenance training conducted","completed":false}]', '[]', '[]', '', '')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_project_stages` (`id`, `project_id`, `stage_key`, `title`, `stage_order`, `department`, `assigned_role`, `assigned_employee_id`, `assigned_employee_name`, `status`, `priority`, `start_date`, `due_date`, `completed_date`, `checklist_json`, `photos_json`, `documents_json`, `notes`, `approved_by`)
VALUES ('proj-5-stage-16', 'proj-5', 'service_amc', 'Service / AMC Handover', 16, 'Service', 'Service Manager', 'emp-11', 'Rohit Verma', 'NOT STARTED', 'MEDIUM', NULL, NULL, NULL, '[{"id":"chk-16-1","title":"Service contract activated in ERP","label":"Service contract activated in ERP","completed":false},{"id":"chk-16-2","title":"Annual maintenance visit calendar scheduled (Quarterly)","label":"Annual maintenance visit calendar scheduled (Quarterly)","completed":false},{"id":"chk-16-3","title":"Emergency breakdown helpline shared with client","label":"Emergency breakdown helpline shared with client","completed":false}]', '[]', '[]', '', '')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);

-- Pushing 14 records into solar_employees
INSERT INTO `solar_employees` (`id`, `employee_code`, `name`, `photo_url`, `department`, `designation`, `phone`, `email`, `joining_date`, `salary_monthly`, `status`, `current_site_location`, `login_enabled`, `system_role`, `is_field_worker`, `account_status`)
VALUES ('emp-1', 'EMP001', 'Vikram Patel', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150', 'Administration', 'Managing Director & Admin', '+91 98250 11223', 'admin@rejoysolar.com', '2021-01-15', 180000, 'ACTIVE', '', 1, 'Admin', 0, 'ACTIVE')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `phone` = VALUES(`phone`), `department` = VALUES(`department`);
INSERT INTO `solar_employees` (`id`, `employee_code`, `name`, `photo_url`, `department`, `designation`, `phone`, `email`, `joining_date`, `salary_monthly`, `status`, `current_site_location`, `login_enabled`, `system_role`, `is_field_worker`, `account_status`)
VALUES ('emp-2', 'EMP002', 'Amit Sharma', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150', 'Operations', 'Senior Project Manager', '+91 98251 22334', 'projectmanager@rejoysolar.com', '2021-04-01', 95000, 'ACTIVE', '', 1, 'Project Manager', 0, 'ACTIVE')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `phone` = VALUES(`phone`), `department` = VALUES(`department`);
INSERT INTO `solar_employees` (`id`, `employee_code`, `name`, `photo_url`, `department`, `designation`, `phone`, `email`, `joining_date`, `salary_monthly`, `status`, `current_site_location`, `login_enabled`, `system_role`, `is_field_worker`, `account_status`)
VALUES ('emp-3', 'EMP003', 'Rajesh Kumar', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150', 'Engineering', 'Lead Site Survey Engineer', '+91 98252 33445', 'survey@rejoysolar.com', '2022-02-10', 65000, 'IN FIELD', 'Sanand Industrial Estate, Plot 42', 1, 'Site Survey Engineer', 1, 'ACTIVE')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `phone` = VALUES(`phone`), `department` = VALUES(`department`);
INSERT INTO `solar_employees` (`id`, `employee_code`, `name`, `photo_url`, `department`, `designation`, `phone`, `email`, `joining_date`, `salary_monthly`, `status`, `current_site_location`, `login_enabled`, `system_role`, `is_field_worker`, `account_status`)
VALUES ('emp-4', 'EMP004', 'Priya Verma', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150', 'Sales', 'Sales Manager - Commercial & Industrial', '+91 98253 44556', 'salesmanager@rejoysolar.com', '2021-08-15', 75000, 'ACTIVE', '', 1, 'Sales Manager', 0, 'ACTIVE')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `phone` = VALUES(`phone`), `department` = VALUES(`department`);
INSERT INTO `solar_employees` (`id`, `employee_code`, `name`, `photo_url`, `department`, `designation`, `phone`, `email`, `joining_date`, `salary_monthly`, `status`, `current_site_location`, `login_enabled`, `system_role`, `is_field_worker`, `account_status`)
VALUES ('emp-5', 'EMP005', 'Rahul Mehta', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=150', 'Sales', 'Solar Sales Executive', '+91 98254 55667', 'sales@rejoysolar.com', '2023-03-01', 45000, 'ACTIVE', '', 1, 'Sales Executive', 0, 'ACTIVE')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `phone` = VALUES(`phone`), `department` = VALUES(`department`);
INSERT INTO `solar_employees` (`id`, `employee_code`, `name`, `photo_url`, `department`, `designation`, `phone`, `email`, `joining_date`, `salary_monthly`, `status`, `current_site_location`, `login_enabled`, `system_role`, `is_field_worker`, `account_status`)
VALUES ('emp-6', 'EMP006', 'Dinesh Yadav', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150', 'Structure', 'Structure Fabrication Lead', '+91 98255 66778', 'structure@rejoysolar.com', '2022-06-15', 48000, 'IN FIELD', '', 1, 'Structure Team', 1, 'ACTIVE')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `phone` = VALUES(`phone`), `department` = VALUES(`department`);
INSERT INTO `solar_employees` (`id`, `employee_code`, `name`, `photo_url`, `department`, `designation`, `phone`, `email`, `joining_date`, `salary_monthly`, `status`, `current_site_location`, `login_enabled`, `system_role`, `is_field_worker`, `account_status`)
VALUES ('emp-7', 'EMP007', 'Manoj Tiwari', 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=150', 'Installation', 'Solar Module Installation Lead', '+91 98256 77889', 'installation@rejoysolar.com', '2022-09-01', 46000, 'IN FIELD', '', 1, 'Installation Team', 1, 'ACTIVE')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `phone` = VALUES(`phone`), `department` = VALUES(`department`);
INSERT INTO `solar_employees` (`id`, `employee_code`, `name`, `photo_url`, `department`, `designation`, `phone`, `email`, `joining_date`, `salary_monthly`, `status`, `current_site_location`, `login_enabled`, `system_role`, `is_field_worker`, `account_status`)
VALUES ('emp-8', 'EMP008', 'Ankit Joshi', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=150', 'Electrical', 'Senior Electrical Engineer (LT/HT)', '+91 98257 88990', 'electrical@rejoysolar.com', '2021-11-20', 62000, 'ACTIVE', '', 1, 'Electrical Team', 1, 'ACTIVE')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `phone` = VALUES(`phone`), `department` = VALUES(`department`);
INSERT INTO `solar_employees` (`id`, `employee_code`, `name`, `photo_url`, `department`, `designation`, `phone`, `email`, `joining_date`, `salary_monthly`, `status`, `current_site_location`, `login_enabled`, `system_role`, `is_field_worker`, `account_status`)
VALUES ('emp-9', 'EMP009', 'Sneha Kulkarni', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=150', 'Finance', 'Chief Accountant & Tally Specialist', '+91 98258 99001', 'accountant@rejoysolar.com', '2021-03-10', 68000, 'ACTIVE', '', 1, 'Accountant', 0, 'ACTIVE')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `phone` = VALUES(`phone`), `department` = VALUES(`department`);
INSERT INTO `solar_employees` (`id`, `employee_code`, `name`, `photo_url`, `department`, `designation`, `phone`, `email`, `joining_date`, `salary_monthly`, `status`, `current_site_location`, `login_enabled`, `system_role`, `is_field_worker`, `account_status`)
VALUES ('emp-10', 'EMP010', 'Neha Gupta', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150', 'HR', 'HR & Admin Manager', '+91 98259 00112', 'hr@rejoysolar.com', '2022-01-05', 58000, 'ACTIVE', '', 1, 'HR Manager', 0, 'ACTIVE')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `phone` = VALUES(`phone`), `department` = VALUES(`department`);
INSERT INTO `solar_employees` (`id`, `employee_code`, `name`, `photo_url`, `department`, `designation`, `phone`, `email`, `joining_date`, `salary_monthly`, `status`, `current_site_location`, `login_enabled`, `system_role`, `is_field_worker`, `account_status`)
VALUES ('emp-11', 'EMP011', 'Rohit Verma', 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=150', 'Service', 'Service Manager', '+91 98260 11223', 'service@rejoysolar.com', '2022-08-12', 52000, 'ACTIVE', '', 1, 'Service Manager', 0, 'ACTIVE')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `phone` = VALUES(`phone`), `department` = VALUES(`department`);
INSERT INTO `solar_employees` (`id`, `employee_code`, `name`, `photo_url`, `department`, `designation`, `phone`, `email`, `joining_date`, `salary_monthly`, `status`, `current_site_location`, `login_enabled`, `system_role`, `is_field_worker`, `account_status`)
VALUES ('emp-12', 'EMP012', 'Ketan Solanki', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150', 'Service', 'Field Service Technician', '+91 98261 22334', 'technician@rejoysolar.com', '2023-01-10', 38000, 'IN FIELD', '', 1, 'Technician', 1, 'ACTIVE')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `phone` = VALUES(`phone`), `department` = VALUES(`department`);
INSERT INTO `solar_employees` (`id`, `employee_code`, `name`, `photo_url`, `department`, `designation`, `phone`, `email`, `joining_date`, `salary_monthly`, `status`, `current_site_location`, `login_enabled`, `system_role`, `is_field_worker`, `account_status`)
VALUES ('emp-13', 'EMP013', 'Hardik Shah', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=150', 'Engineering', 'Senior Site Inspector & Quality Auditor', '+91 98262 33445', 'inspector@rejoysolar.com', '2022-04-18', 55000, 'IN FIELD', '', 1, 'Site Inspector', 1, 'ACTIVE')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `phone` = VALUES(`phone`), `department` = VALUES(`department`);
INSERT INTO `solar_employees` (`id`, `employee_code`, `name`, `photo_url`, `department`, `designation`, `phone`, `email`, `joining_date`, `salary_monthly`, `status`, `current_site_location`, `login_enabled`, `system_role`, `is_field_worker`, `account_status`)
VALUES ('emp-14', 'EMP014', 'Suresh Patel', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=150', 'Civil', 'Civil Foundations Lead', '+91 98263 44556', 'civil@rejoysolar.com', '2022-05-10', 47000, 'IN FIELD', '', 1, 'Civil Team', 1, 'ACTIVE')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `phone` = VALUES(`phone`), `department` = VALUES(`department`);

-- Pushing 7 records into solar_payments
INSERT INTO `solar_payments` (`id`, `receipt_number`, `project_id`, `customer_id`, `customer_name`, `milestone`, `amount`, `status`, `due_date`, `paid_date`, `payment_mode`, `transaction_reference`, `notes`, `tally_sync_status`)
VALUES ('pay-1', 'RCPT-2026-001', 'proj-1', 'cust-1', 'ABC Industries Ltd.', 'Advance', 2000000, 'PAID', '2026-08-15', '2026-08-16', 'Bank NEFT/RTGS', 'HDFC-RTGS-9821034', 'Advance 40% received upon agreement signing', 'SYNCED')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`), `amount` = VALUES(`amount`);
INSERT INTO `solar_payments` (`id`, `receipt_number`, `project_id`, `customer_id`, `customer_name`, `milestone`, `amount`, `status`, `due_date`, `paid_date`, `payment_mode`, `transaction_reference`, `notes`, `tally_sync_status`)
VALUES ('pay-2', 'RCPT-2026-002', 'proj-1', 'cust-1', 'ABC Industries Ltd.', 'Installation', 2000000, 'PAID', '2026-09-04', '2026-09-05', 'Bank NEFT/RTGS', 'ICICI-RTGS-1102938', 'Second milestone 40% released upon structure & module delivery at site', 'SYNCED')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`), `amount` = VALUES(`amount`);
INSERT INTO `solar_payments` (`id`, `receipt_number`, `project_id`, `customer_id`, `customer_name`, `milestone`, `amount`, `status`, `due_date`, `paid_date`, `payment_mode`, `transaction_reference`, `notes`, `tally_sync_status`)
VALUES ('pay-3', 'RCPT-2026-003', 'proj-1', 'cust-1', 'ABC Industries Ltd.', 'Final Handover', 1000000, 'PENDING', '2026-09-20', NULL, 'Bank NEFT/RTGS', '', 'Final 20% balance payable upon Net Metering sync & handover certificate', 'NOT SYNCED')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`), `amount` = VALUES(`amount`);
INSERT INTO `solar_payments` (`id`, `receipt_number`, `project_id`, `customer_id`, `customer_name`, `milestone`, `amount`, `status`, `due_date`, `paid_date`, `payment_mode`, `transaction_reference`, `notes`, `tally_sync_status`)
VALUES ('pay-4', 'RCPT-2026-004', 'proj-2', 'cust-2', 'Zenith Textiles Mills', 'Advance', 4000000, 'PAID', '2026-08-20', '2026-08-21', 'Bank NEFT/RTGS', 'SBI-RTGS-5542109', 'Advance 35% milestone', 'SYNCED')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`), `amount` = VALUES(`amount`);
INSERT INTO `solar_payments` (`id`, `receipt_number`, `project_id`, `customer_id`, `customer_name`, `milestone`, `amount`, `status`, `due_date`, `paid_date`, `payment_mode`, `transaction_reference`, `notes`, `tally_sync_status`)
VALUES ('pay-5', 'RCPT-2026-005', 'proj-4', 'cust-4', 'GreenTech Logistics Hub', 'Advance', 1300000, 'PAID', '2026-07-05', '2026-07-06', 'Bank NEFT/RTGS', '', '', 'SYNCED')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`), `amount` = VALUES(`amount`);
INSERT INTO `solar_payments` (`id`, `receipt_number`, `project_id`, `customer_id`, `customer_name`, `milestone`, `amount`, `status`, `due_date`, `paid_date`, `payment_mode`, `transaction_reference`, `notes`, `tally_sync_status`)
VALUES ('pay-6', 'RCPT-2026-006', 'proj-4', 'cust-4', 'GreenTech Logistics Hub', 'Final Handover', 1300000, 'PAID', '2026-08-29', '2026-08-30', 'Bank NEFT/RTGS', '', '', 'SYNCED')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`), `amount` = VALUES(`amount`);
INSERT INTO `solar_payments` (`id`, `receipt_number`, `project_id`, `customer_id`, `customer_name`, `milestone`, `amount`, `status`, `due_date`, `paid_date`, `payment_mode`, `transaction_reference`, `notes`, `tally_sync_status`)
VALUES ('pay-7', 'RCPT-2026-007', 'proj-5', 'cust-5', 'Sunrise Cold Storage & Agro', 'Installation', 1500000, 'OVERDUE', '2026-08-25', NULL, 'Bank NEFT/RTGS', '', 'Payment delayed by client pending Discom inspection clearance', 'NOT SYNCED')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`), `amount` = VALUES(`amount`);

-- Pushing 5 records into solar_expenses
INSERT INTO `solar_expenses` (`id`, `expense_number`, `project_id`, `project_code`, `vendor_name`, `category`, `amount`, `expense_date`, `payment_mode`, `reference_no`, `notes`, `approved_by`, `tally_sync_status`)
VALUES ('exp-1', 'EXP-2026-081', 'proj-1', 'SOL-2026-001', 'Waaree Energies Ltd', 'Material - Solar Panels', 1850000, '2026-08-01', 'Bank NEFT/RTGS', 'WAA-INV-44910', '185 units of 540W Mono PERC Bifacial Solar PV Modules', '', 'SYNCED')
ON DUPLICATE KEY UPDATE `amount` = VALUES(`amount`);
INSERT INTO `solar_expenses` (`id`, `expense_number`, `project_id`, `project_code`, `vendor_name`, `category`, `amount`, `expense_date`, `payment_mode`, `reference_no`, `notes`, `approved_by`, `tally_sync_status`)
VALUES ('exp-2', 'EXP-2026-082', 'proj-1', 'SOL-2026-001', 'Sungrow Power India Pvt Ltd', 'Material - Inverter', 620000, '2026-08-01', 'Bank NEFT/RTGS', 'SG-INV-9921', '1x 100kW SG100CX 3-Phase Multi-MPPT Inverter', '', 'SYNCED')
ON DUPLICATE KEY UPDATE `amount` = VALUES(`amount`);
INSERT INTO `solar_expenses` (`id`, `expense_number`, `project_id`, `project_code`, `vendor_name`, `category`, `amount`, `expense_date`, `payment_mode`, `reference_no`, `notes`, `approved_by`, `tally_sync_status`)
VALUES ('exp-3', 'EXP-2026-083', 'proj-1', 'SOL-2026-001', 'Shreeji Galvanizers & Steel', 'Structure Steel', 420000, '2026-08-01', 'Bank RTGS', 'SGS-00219', 'Hot Dip Galvanized Solar Mounting Structure 80 micron HDG', '', 'SYNCED')
ON DUPLICATE KEY UPDATE `amount` = VALUES(`amount`);
INSERT INTO `solar_expenses` (`id`, `expense_number`, `project_id`, `project_code`, `vendor_name`, `category`, `amount`, `expense_date`, `payment_mode`, `reference_no`, `notes`, `approved_by`, `tally_sync_status`)
VALUES ('exp-4', 'EXP-2026-084', 'proj-1', 'SOL-2026-001', 'Gujarat ReadyMix Concrete Co.', 'Civil Raw Materials', 145000, '2026-08-01', 'Bank Cheque', 'RMC-CHQ-104', 'M25 ready-mix concrete for roof pedestals', '', 'SYNCED')
ON DUPLICATE KEY UPDATE `amount` = VALUES(`amount`);
INSERT INTO `solar_expenses` (`id`, `expense_number`, `project_id`, `project_code`, `vendor_name`, `category`, `amount`, `expense_date`, `payment_mode`, `reference_no`, `notes`, `approved_by`, `tally_sync_status`)
VALUES ('exp-5', 'EXP-2026-085', 'proj-1', 'SOL-2026-001', 'Polycab India Ltd', 'Material - Cables & BOS', 310000, '2026-08-01', 'Bank NEFT', 'POLY-8812', 'Solar DC 4 sq mm cable 1500m + 3.5C x 95 sq mm XLPE Aluminium AC cable', '', 'NOT SYNCED')
ON DUPLICATE KEY UPDATE `amount` = VALUES(`amount`);

-- Pushing 5 records into solar_attendance
INSERT INTO `solar_attendance` (`id`, `employee_id`, `employee_name`, `attendance_date`, `check_in_time`, `check_out_time`, `check_in_gps_json`, `check_out_gps_json`, `site_project_id`, `site_project_title`, `status`)
VALUES ('att-1', 'emp-3', 'Rajesh Kumar', '2026-08-01', '09:05 AM', '06:15 PM', NULL, NULL, 'proj-1', '100 kW Rooftop Solar - ABC Industries', 'FIELD VISIT')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_attendance` (`id`, `employee_id`, `employee_name`, `attendance_date`, `check_in_time`, `check_out_time`, `check_in_gps_json`, `check_out_gps_json`, `site_project_id`, `site_project_title`, `status`)
VALUES ('att-2', 'emp-7', 'Manoj Tiwari', '2026-08-01', '08:50 AM', '05:45 PM', NULL, NULL, 'proj-1', '100 kW Rooftop Solar - ABC Industries', 'FIELD VISIT')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_attendance` (`id`, `employee_id`, `employee_name`, `attendance_date`, `check_in_time`, `check_out_time`, `check_in_gps_json`, `check_out_gps_json`, `site_project_id`, `site_project_title`, `status`)
VALUES ('att-3', 'emp-2', 'Amit Sharma', '2026-08-01', '09:15 AM', NULL, NULL, NULL, '', '', 'PRESENT')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_attendance` (`id`, `employee_id`, `employee_name`, `attendance_date`, `check_in_time`, `check_out_time`, `check_in_gps_json`, `check_out_gps_json`, `site_project_id`, `site_project_title`, `status`)
VALUES ('att-4', 'emp-9', 'Sneha Kulkarni', '2026-08-01', '09:30 AM', NULL, NULL, NULL, '', '', 'PRESENT')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_attendance` (`id`, `employee_id`, `employee_name`, `attendance_date`, `check_in_time`, `check_out_time`, `check_in_gps_json`, `check_out_gps_json`, `site_project_id`, `site_project_title`, `status`)
VALUES ('att-5', 'emp-4', 'Priya Verma', '2026-08-01', '09:10 AM', NULL, NULL, NULL, '', '', 'PRESENT')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);

-- Pushing 2 records into solar_payslips
INSERT INTO `solar_payslips` (`id`, `employee_id`, `employee_name`, `month`, `year`, `basic_salary`, `allowances`, `deductions`, `net_salary`, `payment_status`, `payment_date`, `notes`)
VALUES ('pay-202609-emp-3', 'emp-3', 'Rajesh Kumar', 'September 2026', 2026, 0, 0, 0, 0, 'PAID', NULL, '')
ON DUPLICATE KEY UPDATE `payment_status` = VALUES(`payment_status`);
INSERT INTO `solar_payslips` (`id`, `employee_id`, `employee_name`, `month`, `year`, `basic_salary`, `allowances`, `deductions`, `net_salary`, `payment_status`, `payment_date`, `notes`)
VALUES ('pay-202609-emp-8', 'emp-8', 'Ankit Joshi', 'September 2026', 2026, 0, 0, 0, 0, 'PAID', '2026-09-07', '')
ON DUPLICATE KEY UPDATE `payment_status` = VALUES(`payment_status`);

-- Pushing 20 records into solar_holidays
INSERT INTO `solar_holidays` (`id`, `name`, `holiday_date`, `type`, `description`)
VALUES ('hol-1', 'Republic Day', '2026-01-26', 'NATIONAL', 'Celebration of the Constitution of India coming into effect. Mandatory national paid holiday.')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);
INSERT INTO `solar_holidays` (`id`, `name`, `holiday_date`, `type`, `description`)
VALUES ('hol-2', 'Holi (Dhulandi)', '2026-03-03', 'FESTIVAL', 'Festival of colors and arrival of spring. Closed for all corporate offices and installation sites.')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);
INSERT INTO `solar_holidays` (`id`, `name`, `holiday_date`, `type`, `description`)
VALUES ('hol-3', 'Eid-ul-Fitr', '2026-03-20', 'FESTIVAL', 'Islamic festival marking the culmination of Ramadan holy month. Subject to moon sighting.')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);
INSERT INTO `solar_holidays` (`id`, `name`, `holiday_date`, `type`, `description`)
VALUES ('hol-4', 'Good Friday', '2026-04-03', 'FESTIVAL', 'Christian holy day commemorating the crucifixion of Jesus Christ.')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);
INSERT INTO `solar_holidays` (`id`, `name`, `holiday_date`, `type`, `description`)
VALUES ('hol-5', 'Dr. B.R. Ambedkar Jayanti', '2026-04-14', 'NATIONAL', 'Birth anniversary of Dr. Bhimrao Ramji Ambedkar, father of the Indian Constitution.')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);
INSERT INTO `solar_holidays` (`id`, `name`, `holiday_date`, `type`, `description`)
VALUES ('hol-6', 'Gujarat Gaurav Din / Labour Day', '2026-05-01', 'REGIONAL', 'Gujarat State Foundation Day & International Workers Day recognition.')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);
INSERT INTO `solar_holidays` (`id`, `name`, `holiday_date`, `type`, `description`)
VALUES ('hol-7', 'Bakrid (Eid-ul-Adha)', '2026-05-27', 'FESTIVAL', 'Feast of the Sacrifice. Floating optional holiday for eligible workforce.')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);
INSERT INTO `solar_holidays` (`id`, `name`, `holiday_date`, `type`, `description`)
VALUES ('hol-8', 'World Environment & Solar Day', '2026-06-05', 'COMPANY', 'SolarPulse special corporate day honoring green solar energy innovation, clean tech, and team sustainability.')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);
INSERT INTO `solar_holidays` (`id`, `name`, `holiday_date`, `type`, `description`)
VALUES ('hol-9', 'Independence Day', '2026-08-15', 'NATIONAL', 'India Independence Day flag hoisting ceremony followed by holiday.')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);
INSERT INTO `solar_holidays` (`id`, `name`, `holiday_date`, `type`, `description`)
VALUES ('hol-10', 'Raksha Bandhan', '2026-08-28', 'FESTIVAL', 'Celebration of bond between brothers and sisters. Optional holiday.')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);
INSERT INTO `solar_holidays` (`id`, `name`, `holiday_date`, `type`, `description`)
VALUES ('hol-11', 'Janmashtami (Lord Krishna Birth)', '2026-09-04', 'FESTIVAL', 'Celebration of the birth of Lord Krishna. Official holiday across Western India operations.')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);
INSERT INTO `solar_holidays` (`id`, `name`, `holiday_date`, `type`, `description`)
VALUES ('hol-12', 'Ganesh Chaturthi', '2026-09-14', 'FESTIVAL', 'Vinayaka Chaturthi celebration & office sthapana pooja.')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);
INSERT INTO `solar_holidays` (`id`, `name`, `holiday_date`, `type`, `description`)
VALUES ('hol-13', 'Mahatma Gandhi Jayanti', '2026-10-02', 'NATIONAL', 'Birth anniversary of Mahatma Gandhi. Mandatory national public holiday.')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);
INSERT INTO `solar_holidays` (`id`, `name`, `holiday_date`, `type`, `description`)
VALUES ('hol-14', 'Dussehra (Vijayadashami)', '2026-10-20', 'FESTIVAL', 'Triumph of light over darkness. Closed for all offices and manufacturing yards.')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);
INSERT INTO `solar_holidays` (`id`, `name`, `holiday_date`, `type`, `description`)
VALUES ('hol-15', 'SolarPulse Annual Foundation Day', '2026-11-01', 'COMPANY', 'SolarPulse Corporate Foundation Day and Annual Employee Excellence Awards celebration.')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);
INSERT INTO `solar_holidays` (`id`, `name`, `holiday_date`, `type`, `description`)
VALUES ('hol-16', 'Diwali (Deepavali & Lakshmi Puja)', '2026-11-08', 'FESTIVAL', 'Grand festival of lights. Mandatory paid holiday for all corporate, project, and warehouse units.')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);
INSERT INTO `solar_holidays` (`id`, `name`, `holiday_date`, `type`, `description`)
VALUES ('hol-17', 'Gujarati New Year (Bestu Varas)', '2026-11-09', 'REGIONAL', 'Vikram Samvat 2083 New Year celebrations and chopda pujan across Gujarat branches.')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);
INSERT INTO `solar_holidays` (`id`, `name`, `holiday_date`, `type`, `description`)
VALUES ('hol-18', 'Bhai Dooj', '2026-11-10', 'FESTIVAL', 'Celebration of brotherly bond after Diwali. Optional holiday.')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);
INSERT INTO `solar_holidays` (`id`, `name`, `holiday_date`, `type`, `description`)
VALUES ('hol-19', 'Guru Nanak Jayanti', '2026-11-24', 'FESTIVAL', 'Gurpurab celebrating the birth of Guru Nanak Dev Ji. Optional floating leave.')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);
INSERT INTO `solar_holidays` (`id`, `name`, `holiday_date`, `type`, `description`)
VALUES ('hol-20', 'Christmas Day', '2026-12-25', 'FESTIVAL', 'Christmas celebration and year-end shutdown period begins.')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- Pushing 2 records into solar_service_tickets
INSERT INTO `solar_service_tickets` (`id`, `ticket_id`, `customer_id`, `customer_name`, `project_id`, `project_title`, `issue`, `category`, `priority`, `assigned_technician_id`, `assigned_technician_name`, `status`, `scheduled_date`, `resolved_date`, `notes`, `photos_json`)
VALUES ('srv-1', 'SRV-2026-001', 'cust-4', 'GreenTech Logistics Hub', 'proj-4', '50 kW Warehouse Solar PV Plant', 'Inverter reported temporary grid undervoltage fault during 12:30 PM power dip.', 'Inverter Error / Offline', 'MEDIUM', 'emp-11', 'Rohit Verma', 'RESOLVED', '2026-09-03', '2026-09-03', 'Firmware AC trip voltage threshold recalibrated to Discom line variance standard. Generating normal 48.2 kW at peak.', '[]')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_service_tickets` (`id`, `ticket_id`, `customer_id`, `customer_name`, `project_id`, `project_title`, `issue`, `category`, `priority`, `assigned_technician_id`, `assigned_technician_name`, `status`, `scheduled_date`, `resolved_date`, `notes`, `photos_json`)
VALUES ('srv-2', 'SRV-2026-002', 'cust-4', 'GreenTech Logistics Hub', 'proj-4', '50 kW Warehouse Solar PV Plant', 'Scheduled Q3 Routine Solar Panel Dust Cleaning & Thermal Imaging Inspection', 'Panel Cleaning / Damage', 'LOW', 'emp-11', 'Rohit Verma', 'VISIT SCHEDULED', '2026-09-12', NULL, 'Water pressure cleaner and thermal drone team booked for Saturday visit.', '[]')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);

-- Pushing 1 records into solar_amc_contracts
INSERT INTO `solar_amc_contracts` (`id`, `amc_code`, `customer_id`, `customer_name`, `project_id`, `project_title`, `plan_name`, `start_date`, `end_date`, `annual_amount`, `visits_completed`, `total_visits`, `status`)
VALUES ('amc-1', 'AMC-2026-01', 'cust-4', 'GreenTech Logistics Hub', 'proj-4', '50 kW Warehouse Solar PV Plant', 'Gold Preventive (4 Visits/Yr)', '2026-09-01', '2027-08-31', 48000, 0, 4, 'ACTIVE')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);

-- Pushing 12 records into solar_products
INSERT INTO `solar_products` (`id`, `name`, `sku`, `category`, `brand`, `model`, `specifications`, `unit`, `hsn_code`, `gst_rate`, `unit_price`, `current_stock`, `reorder_level`, `warehouse_id`, `status`)
VALUES ('prod-1', 'Waaree 540Wp Mono PERC Bifacial Solar PV Module', 'MOD-WAA-540', 'Solar Panels', 'Waaree Energies', '', '', 'NOS', '85414011', 18, 10200, 350, 0, 'wh-1', 'ACTIVE')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `current_stock` = VALUES(`current_stock`), `unit_price` = VALUES(`unit_price`);
INSERT INTO `solar_products` (`id`, `name`, `sku`, `category`, `brand`, `model`, `specifications`, `unit`, `hsn_code`, `gst_rate`, `unit_price`, `current_stock`, `reorder_level`, `warehouse_id`, `status`)
VALUES ('prod-2', 'Adani 545Wp Mono PERC Solar Module', 'MOD-ADN-545', 'Solar Panels', 'Adani Solar', '', '', 'NOS', '85414011', 18, 10400, 220, 0, 'wh-1', 'ACTIVE')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `current_stock` = VALUES(`current_stock`), `unit_price` = VALUES(`unit_price`);
INSERT INTO `solar_products` (`id`, `name`, `sku`, `category`, `brand`, `model`, `specifications`, `unit`, `hsn_code`, `gst_rate`, `unit_price`, `current_stock`, `reorder_level`, `warehouse_id`, `status`)
VALUES ('prod-3', 'Sungrow 110kW String Inverter SG110CX', 'INV-SUN-110', 'Inverters', 'Sungrow', '', '', 'NOS', '85044090', 18, 285000, 5, 0, 'wh-1', 'ACTIVE')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `current_stock` = VALUES(`current_stock`), `unit_price` = VALUES(`unit_price`);
INSERT INTO `solar_products` (`id`, `name`, `sku`, `category`, `brand`, `model`, `specifications`, `unit`, `hsn_code`, `gst_rate`, `unit_price`, `current_stock`, `reorder_level`, `warehouse_id`, `status`)
VALUES ('prod-4', 'Growatt 50kW On-Grid Inverter MAC 50KTL3-X', 'INV-GRO-50', 'Inverters', 'Growatt', '', '', 'NOS', '85044090', 18, 145000, 8, 0, 'wh-1', 'ACTIVE')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `current_stock` = VALUES(`current_stock`), `unit_price` = VALUES(`unit_price`);
INSERT INTO `solar_products` (`id`, `name`, `sku`, `category`, `brand`, `model`, `specifications`, `unit`, `hsn_code`, `gst_rate`, `unit_price`, `current_stock`, `reorder_level`, `warehouse_id`, `status`)
VALUES ('prod-5', 'Hot Dip Galvanized Solar Mounting Structure 15° Tilt', 'STR-HDG-15', 'Mounting Structures', 'Jindal Steel', '', '', 'SETS', '73089090', 18, 3800, 140, 0, 'wh-1', 'ACTIVE')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `current_stock` = VALUES(`current_stock`), `unit_price` = VALUES(`unit_price`);
INSERT INTO `solar_products` (`id`, `name`, `sku`, `category`, `brand`, `model`, `specifications`, `unit`, `hsn_code`, `gst_rate`, `unit_price`, `current_stock`, `reorder_level`, `warehouse_id`, `status`)
VALUES ('prod-6', 'Polycab 1C x 4 sq.mm Solar DC Cable (Red)', 'CAB-DC-4R', 'Electrical & Cables', 'Polycab', '', '', 'METERS', '85444999', 18, 46, 1800, 0, 'wh-1', 'ACTIVE')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `current_stock` = VALUES(`current_stock`), `unit_price` = VALUES(`unit_price`);
INSERT INTO `solar_products` (`id`, `name`, `sku`, `category`, `brand`, `model`, `specifications`, `unit`, `hsn_code`, `gst_rate`, `unit_price`, `current_stock`, `reorder_level`, `warehouse_id`, `status`)
VALUES ('prod-7', 'Polycab 1C x 4 sq.mm Solar DC Cable (Black)', 'CAB-DC-4B', 'Electrical & Cables', 'Polycab', '', '', 'METERS', '85444999', 18, 46, 1750, 0, 'wh-1', 'ACTIVE')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `current_stock` = VALUES(`current_stock`), `unit_price` = VALUES(`unit_price`);
INSERT INTO `solar_products` (`id`, `name`, `sku`, `category`, `brand`, `model`, `specifications`, `unit`, `hsn_code`, `gst_rate`, `unit_price`, `current_stock`, `reorder_level`, `warehouse_id`, `status`)
VALUES ('prod-8', 'Havells 3.5C x 70 sq.mm Al Armoured LT XLPE Cable', 'CAB-AC-70', 'Electrical & Cables', 'Havells', '', '', 'METERS', '85444920', 18, 390, 480, 0, 'wh-1', 'ACTIVE')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `current_stock` = VALUES(`current_stock`), `unit_price` = VALUES(`unit_price`);
INSERT INTO `solar_products` (`id`, `name`, `sku`, `category`, `brand`, `model`, `specifications`, `unit`, `hsn_code`, `gst_rate`, `unit_price`, `current_stock`, `reorder_level`, `warehouse_id`, `status`)
VALUES ('prod-9', 'Chemical Earthing Electrode Kit 50mm x 3m with BFC Compound', 'EARTH-CH-50', 'Electrical & Cables', 'Truepower', '', '', 'SETS', '85359090', 18, 4500, 35, 0, 'wh-1', 'ACTIVE')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `current_stock` = VALUES(`current_stock`), `unit_price` = VALUES(`unit_price`);
INSERT INTO `solar_products` (`id`, `name`, `sku`, `category`, `brand`, `model`, `specifications`, `unit`, `hsn_code`, `gst_rate`, `unit_price`, `current_stock`, `reorder_level`, `warehouse_id`, `status`)
VALUES ('prod-10', 'Early Streamer Emission (ESE) Lightning Arrestor 107m', 'LA-ESE-107', 'Safety & Accessories', 'Truepower', '', '', 'NOS', '85354010', 18, 21000, 9, 0, 'wh-1', 'ACTIVE')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `current_stock` = VALUES(`current_stock`), `unit_price` = VALUES(`unit_price`);
INSERT INTO `solar_products` (`id`, `name`, `sku`, `category`, `brand`, `model`, `specifications`, `unit`, `hsn_code`, `gst_rate`, `unit_price`, `current_stock`, `reorder_level`, `warehouse_id`, `status`)
VALUES ('prod-11', 'IP65 ACDB 100kW Junction Box with Type II SPD & MCCB', 'BOX-ACDB-100', 'Electrical & Cables', 'SolarPulse Fab', '', '', 'NOS', '85371000', 18, 29000, 6, 0, 'wh-1', 'ACTIVE')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `current_stock` = VALUES(`current_stock`), `unit_price` = VALUES(`unit_price`);
INSERT INTO `solar_products` (`id`, `name`, `sku`, `category`, `brand`, `model`, `specifications`, `unit`, `hsn_code`, `gst_rate`, `unit_price`, `current_stock`, `reorder_level`, `warehouse_id`, `status`)
VALUES ('prod-12', 'Stainless Steel Fasteners & Mid/End Clamps Pack M8/M10', 'FAST-SS-M8', 'Civil & Fasteners', 'Jindal Fasteners', '', '', 'PACKS', '73181500', 18, 1200, 65, 0, 'wh-1', 'ACTIVE')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `current_stock` = VALUES(`current_stock`), `unit_price` = VALUES(`unit_price`);

-- Pushing 5 records into solar_vendors
INSERT INTO `solar_vendors` (`id`, `name`, `vendor_code`, `contact_person`, `phone`, `email`, `address`, `city`, `state`, `gst_number`, `pan_number`, `payment_terms`, `rating`, `categories_json`, `status`)
VALUES ('vnd-1', 'Waaree Energies Limited', 'VND-001', 'Ramesh Joshi', '+91 98200 12345', 'sales@waaree.com', '602, Western Edge I, Western Express Highway, Borivali East', 'Mumbai', 'Maharashtra', '27AAACW1234F1Z5', '', '30 Days Credit', 5, '[]', 'ACTIVE')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `phone` = VALUES(`phone`);
INSERT INTO `solar_vendors` (`id`, `name`, `vendor_code`, `contact_person`, `phone`, `email`, `address`, `city`, `state`, `gst_number`, `pan_number`, `payment_terms`, `rating`, `categories_json`, `status`)
VALUES ('vnd-2', 'Sungrow Power Supply India Pvt Ltd', 'VND-002', 'Pooja Rao', '+91 98450 67890', 'india@sungrowpower.com', 'Plot 45, KIADB Industrial Area, Phase II, Electronic City', 'Bengaluru', 'Karnataka', '29AAGCS5678K1Z2', '', 'Advance 20%, Balance on Delivery', 5, '[]', 'ACTIVE')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `phone` = VALUES(`phone`);
INSERT INTO `solar_vendors` (`id`, `name`, `vendor_code`, `contact_person`, `phone`, `email`, `address`, `city`, `state`, `gst_number`, `pan_number`, `payment_terms`, `rating`, `categories_json`, `status`)
VALUES ('vnd-3', 'Jindal Aluminium & Steel Works', 'VND-003', 'Suresh Jindal', '+91 98790 34567', 'orders@jindalstructures.in', 'Plot 112, GIDC Industrial Estate, Vatva', 'Ahmedabad', 'Gujarat', '24AAACJ9876Q1Z9', '', '15 Days Net', 4, '[]', 'ACTIVE')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `phone` = VALUES(`phone`);
INSERT INTO `solar_vendors` (`id`, `name`, `vendor_code`, `contact_person`, `phone`, `email`, `address`, `city`, `state`, `gst_number`, `pan_number`, `payment_terms`, `rating`, `categories_json`, `status`)
VALUES ('vnd-4', 'Polycab India Limited', 'VND-004', 'Nitin Mehta', '+91 98250 89012', 'solar.cables@polycab.com', 'Polycab House, 771 Mogul Lane, Mahim West', 'Vadodara', 'Gujarat', '24AAACP5544L1Z3', '', '30 Days Credit', 5, '[]', 'ACTIVE')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `phone` = VALUES(`phone`);
INSERT INTO `solar_vendors` (`id`, `name`, `vendor_code`, `contact_person`, `phone`, `email`, `address`, `city`, `state`, `gst_number`, `pan_number`, `payment_terms`, `rating`, `categories_json`, `status`)
VALUES ('vnd-5', 'Truepower Earthings & Lightning Systems', 'VND-005', 'Kavita Sen', '+91 98110 54321', 'projects@truepower.biz', 'B-48, Okhla Industrial Area, Phase 1', 'New Delhi', 'Delhi', '07AABCT3322N1Z4', '', 'Immediate Cheque', 4, '[]', 'ACTIVE')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `phone` = VALUES(`phone`);

-- Pushing 4 records into solar_purchase_orders
INSERT INTO `solar_purchase_orders` (`id`, `po_number`, `vendor_id`, `vendor_name`, `po_date`, `expected_delivery_date`, `project_id`, `items_json`, `subtotal`, `gst_amount`, `total_amount`, `status`, `payment_status`, `receipts_json`, `notes`)
VALUES ('po-1', 'po-1', 'vnd-1', 'Waaree Energies Limited', '2026-08-01', '2026-08-18', 'proj-1', '[{"id":"poi-1","productId":"prod-1","productName":"Waaree 540Wp Mono PERC Bifacial Solar PV Module","sku":"MOD-WAA-540","category":"Solar Panels","orderedQuantity":200,"receivedQuantity":200,"pendingQuantity":0,"unit":"NOS","unitPrice":10200,"taxPercent":12,"taxAmount":244800,"totalAmount":2284800,"quantity":200,"taxRatePercent":12,"totalPrice":2284800,"rejectedQuantity":0}]', 2040000, 0, 2284800, 'RECEIVED', 'PAID', '[]', 'Dispatched directly to ABC Industries site in Sanand. Site survey verified.')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`), `total_amount` = VALUES(`total_amount`);
INSERT INTO `solar_purchase_orders` (`id`, `po_number`, `vendor_id`, `vendor_name`, `po_date`, `expected_delivery_date`, `project_id`, `items_json`, `subtotal`, `gst_amount`, `total_amount`, `status`, `payment_status`, `receipts_json`, `notes`)
VALUES ('po-2', 'po-2', 'vnd-2', 'Sungrow Power Supply India Pvt Ltd', '2026-08-01', '2026-08-20', 'proj-1', '[{"id":"poi-2","productId":"prod-3","productName":"Sungrow 110kW String Inverter SG110CX","sku":"INV-SUN-110","category":"Inverters","orderedQuantity":2,"receivedQuantity":2,"pendingQuantity":0,"unit":"NOS","unitPrice":285000,"taxPercent":12,"taxAmount":68400,"totalAmount":638400,"quantity":2,"taxRatePercent":12,"totalPrice":638400,"rejectedQuantity":0}]', 570000, 0, 638400, 'RECEIVED', 'PAID', '[]', 'Includes manufacturer warranty certificates and Wi-Fi dongles.')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`), `total_amount` = VALUES(`total_amount`);
INSERT INTO `solar_purchase_orders` (`id`, `po_number`, `vendor_id`, `vendor_name`, `po_date`, `expected_delivery_date`, `project_id`, `items_json`, `subtotal`, `gst_amount`, `total_amount`, `status`, `payment_status`, `receipts_json`, `notes`)
VALUES ('po-3', 'po-3', 'vnd-4', 'Polycab India Limited', '2026-08-01', '2026-09-22', 'proj-2', '[{"id":"poi-3","productId":"prod-6","productName":"Polycab 1C x 4 sq.mm Solar DC Cable (Red)","sku":"CAB-DC-4R","category":"Electrical & Cables","orderedQuantity":1000,"receivedQuantity":0,"pendingQuantity":1000,"unit":"METERS","unitPrice":46,"taxPercent":18,"taxAmount":8280,"totalAmount":54280,"quantity":1000,"taxRatePercent":18,"totalPrice":54280,"rejectedQuantity":0},{"id":"poi-4","productId":"prod-7","productName":"Polycab 1C x 4 sq.mm Solar DC Cable (Black)","sku":"CAB-DC-4B","category":"Electrical & Cables","orderedQuantity":1000,"receivedQuantity":0,"pendingQuantity":1000,"unit":"METERS","unitPrice":46,"taxPercent":18,"taxAmount":8280,"totalAmount":54280,"quantity":1000,"taxRatePercent":18,"totalPrice":54280,"rejectedQuantity":0}]', 92000, 0, 108560, 'ORDERED', 'PARTIALLY_PAID', '[]', 'Delivery expected at regional warehouse for string distribution.')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`), `total_amount` = VALUES(`total_amount`);
INSERT INTO `solar_purchase_orders` (`id`, `po_number`, `vendor_id`, `vendor_name`, `po_date`, `expected_delivery_date`, `project_id`, `items_json`, `subtotal`, `gst_amount`, `total_amount`, `status`, `payment_status`, `receipts_json`, `notes`)
VALUES ('po-4', 'po-4', 'vnd-1', 'Waaree Energies Limited', '2026-08-01', '2026-09-25', 'proj-2', '[{"id":"poi-5","productId":"prod-1","productName":"Waaree 540Wp Mono PERC Bifacial Solar PV Module","sku":"MOD-WAA-540","category":"Solar Panels","orderedQuantity":92,"receivedQuantity":50,"pendingQuantity":42,"unit":"NOS","unitPrice":10200,"taxPercent":12,"taxAmount":112608,"totalAmount":1051008,"quantity":92,"taxRatePercent":12,"totalPrice":1051008,"notes":"First dispatch of 50 received. 42 pending from factory.","rejectedQuantity":0}]', 938400, 0, 1051008, 'PARTIALLY_RECEIVED', 'PARTIALLY_PAID', '[]', 'Partial batch shipped due to trailer space limits. Balance 42 modules scheduled for next week.')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`), `total_amount` = VALUES(`total_amount`);

-- Pushing 3 records into solar_boms
INSERT INTO `solar_boms` (`id`, `bom_number`, `project_id`, `project_title`, `system_capacity_kw`, `version`, `status`, `items_json`, `total_estimated_cost`, `created_by`, `approved_by`, `notes`)
VALUES ('bom-rsp-199', 'BOM-2026-199', 'proj-manohar', 'Residential Rooftop Solar System', 0, 'v1.0', 'APPROVED', '[{"id":"bomi-rsp-1","productId":"prod-topcon-585","productName":"Bin -08-585 Dcr M10 Topcon Gg Module","sku":"MOD-TOPCON-585","category":"Solar Panels","requiredQty":6,"allocatedQty":6,"unit":"NOS","estimatedUnitCost":17142.86,"totalCost":102857.16,"status":"ALLOCATED"},{"id":"bomi-rsp-2","productId":"prod-earth-kit","productName":"1 Mtr Earthing Kit 6Inch","sku":"ELE-EARTH-6IN","category":"Electrical & Cables","requiredQty":1,"allocatedQty":1,"unit":"NOS","estimatedUnitCost":5000,"totalCost":5000,"status":"ALLOCATED"}]', 0, 'Project Engineer', 'Vikram Patel', 'Approved for dispatch from Bhilai Central Warehouse to Kadambari Nagar, Durg.')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_boms` (`id`, `bom_number`, `project_id`, `project_title`, `system_capacity_kw`, `version`, `status`, `items_json`, `total_estimated_cost`, `created_by`, `approved_by`, `notes`)
VALUES ('bom-1', 'BOM-2026-001', 'proj-1', '100 kW Rooftop Solar Plant', 0, 'v1.2', 'APPROVED', '[{"id":"bomi-1","productId":"prod-1","productName":"Waaree 540Wp Mono PERC Bifacial Solar PV Module","sku":"MOD-WAA-540","category":"Solar Panels","requiredQty":185,"allocatedQty":185,"unit":"NOS","estimatedUnitCost":10200,"totalCost":1887000,"status":"INSTALLED"},{"id":"bomi-2","productId":"prod-3","productName":"Sungrow 110kW String Inverter SG110CX","sku":"INV-SUN-110","category":"Inverters","requiredQty":1,"allocatedQty":1,"unit":"NOS","estimatedUnitCost":285000,"totalCost":285000,"status":"ALLOCATED"},{"id":"bomi-3","productId":"prod-5","productName":"Hot Dip Galvanized Solar Mounting Structure 15° Tilt","sku":"STR-HDG-15","category":"Mounting Structures","requiredQty":46,"allocatedQty":46,"unit":"SETS","estimatedUnitCost":3800,"totalCost":174800,"status":"DISPATCHED"},{"id":"bomi-4","productId":"prod-6","productName":"Polycab 1C x 4 sq.mm Solar DC Cable (Red)","sku":"CAB-DC-4R","category":"Electrical & Cables","requiredQty":750,"allocatedQty":750,"unit":"METERS","estimatedUnitCost":46,"totalCost":34500,"status":"ALLOCATED"},{"id":"bomi-5","productId":"prod-7","productName":"Polycab 1C x 4 sq.mm Solar DC Cable (Black)","sku":"CAB-DC-4B","category":"Electrical & Cables","requiredQty":750,"allocatedQty":750,"unit":"METERS","estimatedUnitCost":46,"totalCost":34500,"status":"ALLOCATED"},{"id":"bomi-6","productId":"prod-11","productName":"IP65 ACDB 100kW Junction Box with Type II SPD & MCCB","sku":"BOX-ACDB-100","category":"Electrical & Cables","requiredQty":1,"allocatedQty":1,"unit":"NOS","estimatedUnitCost":29000,"totalCost":29000,"status":"ALLOCATED"},{"id":"bomi-7","productId":"prod-9","productName":"Chemical Earthing Electrode Kit 50mm x 3m with BFC Compound","sku":"EARTH-CH-50","category":"Electrical & Cables","requiredQty":6,"allocatedQty":6,"unit":"SETS","estimatedUnitCost":4500,"totalCost":27000,"status":"INSTALLED"}]', 0, 'Amit Sharma', 'Vikram Patel', 'Approved based on finalized roof layout drawing Rev 3 with 23° elevated structure.')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_boms` (`id`, `bom_number`, `project_id`, `project_title`, `system_capacity_kw`, `version`, `status`, `items_json`, `total_estimated_cost`, `created_by`, `approved_by`, `notes`)
VALUES ('bom-2', 'BOM-2026-002', 'proj-2', '50 kW Solar PV Project', 0, 'v1.0', 'RELEASED_TO_SITE', '[{"id":"bomi-201","productId":"prod-2","productName":"Adani 545Wp Mono PERC Solar Module","sku":"MOD-ADN-545","category":"Solar Panels","requiredQty":92,"allocatedQty":92,"unit":"NOS","estimatedUnitCost":10400,"totalCost":956800,"status":"DISPATCHED"},{"id":"bomi-202","productId":"prod-4","productName":"Growatt 50kW On-Grid Inverter MAC 50KTL3-X","sku":"INV-GRO-50","category":"Inverters","requiredQty":1,"allocatedQty":1,"unit":"NOS","estimatedUnitCost":145000,"totalCost":145000,"status":"ALLOCATED"},{"id":"bomi-203","productId":"prod-5","productName":"Hot Dip Galvanized Solar Mounting Structure 15° Tilt","sku":"STR-HDG-15","category":"Mounting Structures","requiredQty":23,"allocatedQty":23,"unit":"SETS","estimatedUnitCost":3800,"totalCost":87400,"status":"DISPATCHED"}]', 0, 'Amit Sharma', 'Vikram Patel', 'Released for civil & structure team fabrication.')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);

-- Pushing 2 records into solar_sales_invoices
INSERT INTO `solar_sales_invoices` (`id`, `invoice_number`, `project_id`, `customer_id`, `customer_name`, `invoice_date`, `due_date`, `items_json`, `subtotal`, `gst_amount`, `total_amount`, `payment_status`, `paid_amount`, `balance_amount`, `eway_bill_number`, `eway_bill_details_json`, `warehouse_id`, `notes`)
VALUES ('inv-1', 'INV-2026-001', 'proj-1', 'cust-1', 'ABC Industries Ltd.', '2026-08-15', '2026-08-30', '[{"id":"ili-1","productId":"prod-1","description":"Advance Milestone 30%: Supply of 185 Nos Waaree 540Wp Bifacial Solar PV Modules","hsnCode":"85414011","quantity":185,"unit":"NOS","unitPrice":6756.75,"taxRatePercent":12,"taxAmount":150000,"totalAmount":1400000}]', 1250000, 0, 1400000, 'UNPAID', 0, 0, '', NULL, '', 'Advance milestone payment receipt #REC-001 received on 14 Aug 2026.')
ON DUPLICATE KEY UPDATE `payment_status` = VALUES(`payment_status`);
INSERT INTO `solar_sales_invoices` (`id`, `invoice_number`, `project_id`, `customer_id`, `customer_name`, `invoice_date`, `due_date`, `items_json`, `subtotal`, `gst_amount`, `total_amount`, `payment_status`, `paid_amount`, `balance_amount`, `eway_bill_number`, `eway_bill_details_json`, `warehouse_id`, `notes`)
VALUES ('inv-2', 'INV-2026-002', 'proj-2', 'cust-2', 'Sunrise Textiles Ltd.', '2026-09-02', '2026-09-17', '[{"id":"ili-2","productId":"prod-4","description":"Material Milestone: Supply of 50 kW On-Grid Growatt Inverter & HDG Structures","hsnCode":"85044090","quantity":1,"unit":"SET","unitPrice":850000,"taxRatePercent":12,"taxAmount":102000,"totalAmount":952000}]', 850000, 0, 952000, 'UNPAID', 0, 0, '', NULL, '', 'Dispatched inverter and structural material. Milestone inspection scheduled.')
ON DUPLICATE KEY UPDATE `payment_status` = VALUES(`payment_status`);

-- Pushing 4 records into solar_warehouses
INSERT INTO `solar_warehouses` (`id`, `name`, `code`, `address`, `city`, `state`, `pincode`, `manager_name`, `manager_phone`, `gst_number`, `is_active`)
VALUES ('wh-bhl-01', 'Bhilai Central Logistics Depot', 'WH-BHL-01', 'PLOT NO- 14, STREET NO- 14B, PRAGATI NAGAR, RISALI BHILAI', 'BHILAI', 'Chhattisgarh', '490006', '', '', '', 1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `code` = VALUES(`code`);
INSERT INTO `solar_warehouses` (`id`, `name`, `code`, `address`, `city`, `state`, `pincode`, `manager_name`, `manager_phone`, `gst_number`, `is_active`)
VALUES ('wh-1', 'Central Solar Logistics Hub - Pune', 'WH-PUN-01', 'Plot 42, MIDC Bhosari Industrial Area', 'Pune', 'Maharashtra', '411026', '', '', '', 1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `code` = VALUES(`code`);
INSERT INTO `solar_warehouses` (`id`, `name`, `code`, `address`, `city`, `state`, `pincode`, `manager_name`, `manager_phone`, `gst_number`, `is_active`)
VALUES ('wh-2', 'North India Distribution Hub - Gurugram', 'WH-GGN-02', 'Shed 18, Sector 37 Pace City II', 'Gurugram', 'Haryana', '122001', '', '', '', 1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `code` = VALUES(`code`);
INSERT INTO `solar_warehouses` (`id`, `name`, `code`, `address`, `city`, `state`, `pincode`, `manager_name`, `manager_phone`, `gst_number`, `is_active`)
VALUES ('wh-3', 'South Regional Depot - Bengaluru', 'WH-BLR-03', 'Phase 2, Peenya Industrial Area', 'Bengaluru', 'Karnataka', '560058', '', '', '', 1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `code` = VALUES(`code`);

-- Pushing 4 records into solar_stock_movements
INSERT INTO `solar_stock_movements` (`id`, `product_id`, `product_name`, `sku`, `movement_type`, `quantity`, `balance_after`, `reference_number`, `warehouse_id`, `notes`, `timestamp`, `performed_by`)
VALUES ('sm-1', 'prod-1', 'Waaree 540Wp Mono PERC Bifacial Solar PV Module', 'MOD-WAA-540', 'PURCHASE_RECEIPT', 200, 535, 'PO-2026-001', '', 'Received from Waaree Energies Ltd.', '2026-08-18T16:00:00Z', 'Amit Sharma')
ON DUPLICATE KEY UPDATE `balance_after` = VALUES(`balance_after`);
INSERT INTO `solar_stock_movements` (`id`, `product_id`, `product_name`, `sku`, `movement_type`, `quantity`, `balance_after`, `reference_number`, `warehouse_id`, `notes`, `timestamp`, `performed_by`)
VALUES ('sm-2', 'prod-1', 'Waaree 540Wp Mono PERC Bifacial Solar PV Module', 'MOD-WAA-540', 'BOM_ALLOCATION', -185, 350, 'BOM-2026-001', '', 'Allocated for ABC Industries 100kW project', '2026-08-20T10:00:00Z', 'Amit Sharma')
ON DUPLICATE KEY UPDATE `balance_after` = VALUES(`balance_after`);
INSERT INTO `solar_stock_movements` (`id`, `product_id`, `product_name`, `sku`, `movement_type`, `quantity`, `balance_after`, `reference_number`, `warehouse_id`, `notes`, `timestamp`, `performed_by`)
VALUES ('sm-3', 'prod-3', 'Sungrow 110kW String Inverter SG110CX', 'INV-SUN-110', 'PURCHASE_RECEIPT', 2, 6, 'PO-2026-002', '', 'Received from Sungrow Power Supply India', '2026-08-20T17:00:00Z', 'Amit Sharma')
ON DUPLICATE KEY UPDATE `balance_after` = VALUES(`balance_after`);
INSERT INTO `solar_stock_movements` (`id`, `product_id`, `product_name`, `sku`, `movement_type`, `quantity`, `balance_after`, `reference_number`, `warehouse_id`, `notes`, `timestamp`, `performed_by`)
VALUES ('sm-4', 'prod-3', 'Sungrow 110kW String Inverter SG110CX', 'INV-SUN-110', 'BOM_ALLOCATION', -1, 5, 'BOM-2026-001', '', 'Allocated for ABC Industries 100kW project', '2026-08-22T11:00:00Z', 'Amit Sharma')
ON DUPLICATE KEY UPDATE `balance_after` = VALUES(`balance_after`);

-- Pushing 2 records into solar_stock_audits
INSERT INTO `solar_stock_audits` (`id`, `audit_number`, `warehouse_id`, `warehouse_name`, `audit_date`, `auditor_name`, `status`, `discrepancies_count`, `items_json`, `notes`)
VALUES ('audit-1', 'AUD-2026-001', 'wh-1', 'Central Solar Logistics Hub - Pune', '2026-09-15', 'Amit Sharma', 'COMPLETED', 0, '[]', 'Quarterly comprehensive physical verification of solar modules and inverters.')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
INSERT INTO `solar_stock_audits` (`id`, `audit_number`, `warehouse_id`, `warehouse_name`, `audit_date`, `auditor_name`, `status`, `discrepancies_count`, `items_json`, `notes`)
VALUES ('audit-2', 'AUD-2026-002', 'wh-2', 'North India Distribution Hub - Gurugram', '2026-09-20', 'Amit Sharma', 'COMPLETED', 0, '[]', 'Biannual hardware count, mounting rails, and DC isolators reconciliation.')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);

-- Pushing 2 records into solar_quotations
INSERT INTO `solar_quotations` (`id`, `quotation_number`, `customer_id`, `customer_name`, `project_id`, `capacity_kw`, `rate_per_wp`, `base_amount`, `tax_amount`, `panel_brand`, `inverter_brand`, `structure_type`, `items_json`, `subtotal`, `discount_amount`, `gst_percent`, `gst_amount`, `total_amount`, `status`, `valid_until`)
VALUES ('quote-waaree-5kw-ref', 'RSP/QTN/2026-27/0010', 'cust-1', 'Shri Rameshwar Patel', '', 5, 58.77, 293848, 26152, 'Waaree 545W', 'Waaree 5KW 3PH Grid Tie', 'Elevated HDG / GI Structure', '[{"id":"bom-1","productName":"DCR Bifacial Solar 545W Module","make":"Waaree","specification":"545Wp DCR Tier-1 Bifacial Dual Glass Mono PERC Modules","quantity":9,"unit":"Nos","rate":14500,"amount":130500,"category":"Panels"},{"id":"bom-2","productName":"Grid Tie Inverter 5KW 3PH (With WIFI Stick)","make":"Waaree","specification":"5 kW 3-Phase On-Grid String Inverter with remote WiFi monitoring","quantity":1,"unit":"No","rate":52000,"amount":52000,"category":"Inverter"},{"id":"bom-3","productName":"ACDB - DCDB BOX 3PH - 1 in 1 out","make":"Waaree","specification":"IP65 Polycarbonate Enclosure, SPD Type-II, MCB/MCCB & Fuse Protection","quantity":1,"unit":"Pair","rate":9500,"amount":9500,"category":"Electrical"},{"id":"bom-4","productName":"JSW/APL GI Module Mounting Structure Elevated","make":"JSW / APL Apollo","specification":"Hot-Dip Galvanized / Pre-GI elevated rooftop structure (80-120 micron)","quantity":1,"unit":"Set","rate":38000,"amount":38000,"category":"Structure"},{"id":"bom-5","productName":"Net Meter (CSPDCL) Genius/Equivalent","make":"Genius / Secure","specification":"3-Phase Bi-directional Net Meter approved by CSPDCL/DISCOM","quantity":1,"unit":"No","rate":8500,"amount":8500,"category":"Net Metering"},{"id":"bom-6","productName":"Earthing Kit","make":"Waaree","specification":"Chemical Earthing Electrodes with BFC compound & grounding strip","quantity":1,"unit":"Set","rate":7500,"amount":7500,"category":"Electrical"},{"id":"bom-7","productName":"DC/AC/Earthing wires and cables","make":"Polycab / FlipCap / HPL","specification":"1C x 4/6 sq.mm Solar DC XLPO Cable, 4C Cu/Al AC armored cable","quantity":1,"unit":"Lot","rate":16848,"amount":16848,"category":"Electrical"},{"id":"bom-8","productName":"PVC Pipes, MC4 Connectors, Tape, Joints, Cable Tray, Meter Board, Zip Tie, etc.","make":"As Standard","specification":"Balance of System: Conduit pipes, glands, lugs, fasteners, trays","quantity":1,"unit":"Lot","rate":6000,"amount":6000,"category":"Other"}]', 0, 0, 13.8, 26152, 320000, 'SENT', NULL)
ON DUPLICATE KEY UPDATE `total_amount` = VALUES(`total_amount`);
INSERT INTO `solar_quotations` (`id`, `quotation_number`, `customer_id`, `customer_name`, `project_id`, `capacity_kw`, `rate_per_wp`, `base_amount`, `tax_amount`, `panel_brand`, `inverter_brand`, `structure_type`, `items_json`, `subtotal`, `discount_amount`, `gst_percent`, `gst_amount`, `total_amount`, `status`, `valid_until`)
VALUES ('quote-1', 'QTN-2026-0042', 'cust-1', 'ABC Industries Ltd.', 'proj-1', 100, 0, 0, 0, '', '', '', '[{"id":"qi-1","category":"Panels","description":"Tier-1 Mono PERC Bifacial 540W Modules","makeModel":"Waaree / Adani 540Wp","quantity":185,"unit":"Nos","unitPrice":10200,"totalPrice":1887000},{"id":"qi-2","category":"Inverter","description":"100 kW On-Grid 3-Phase String Inverter with Multi-MPPT","makeModel":"Sungrow SG100CX","quantity":1,"unit":"Set","unitPrice":620000,"totalPrice":620000},{"id":"qi-3","category":"Structure","description":"HDG 80 Micron Elevated Module Mounting Structure with 23° Tilt","makeModel":"Hot Dip Galvanized Steel","quantity":100,"unit":"kW","unitPrice":4200,"totalPrice":420000},{"id":"qi-4","category":"Civil Work","description":"RCC Pedestal Casting M25 with Anchor Bolts & Chemical Waterproofing","makeModel":"Civil Pedestals","quantity":28,"unit":"Pillars","unitPrice":6000,"totalPrice":168000},{"id":"qi-5","category":"Electrical","description":"ACDB, DCDB with SPD Type II, Earthing Pits (4 Nos) & ESE Lightning Protection","makeModel":"ABB/L&T Breakers + Chemical Earth","quantity":1,"unit":"Lot","unitPrice":490000,"totalPrice":490000},{"id":"qi-6","category":"Installation","description":"Turnkey Mechanical, Electrical, Cable Trays, Pulling & Commissioning","makeModel":"SolarPulse Certified Engineering","quantity":100,"unit":"kW","unitPrice":6500,"totalPrice":650000},{"id":"qi-7","category":"Net Metering","description":"CEIG Drawings, Discom Net Metering Liasoning & Testing","makeModel":"Discom Standard","quantity":1,"unit":"Job","unitPrice":265000,"totalPrice":265000}]', 4500000, 262712, 18, 762712, 5000000, 'ACCEPTED', '2026-09-15')
ON DUPLICATE KEY UPDATE `total_amount` = VALUES(`total_amount`);

-- Pushing 1 records into solar_site_surveys
INSERT INTO `solar_site_surveys` (`id`, `project_id`, `customer_id`, `engineer_id`, `engineer_name`, `survey_date`, `status`, `site_address`, `latitude`, `longitude`, `location_name`, `roof_type`, `roof_area_sqft`, `shadow_free_area_sqft`, `recommended_capacity_kw`, `feasibility_score`, `photos_json`, `notes`)
VALUES ('surv-1', 'proj-1', 'cust-1', 'emp-3', 'Rajesh Kumar', '2026-08-14', 'APPROVED', 'Plot No. 42-45, GIDC Industrial Estate, Sanand, Ahmedabad', NULL, NULL, '', 'RCC Flat', 0, 0, 100, 'EXCELLENT', '[{"id":"sp-1","url":"https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&q=80&w=400","caption":"South facing roof clear area","type":"BEFORE","uploadedAt":"2026-08-14","uploadedBy":"Rajesh Kumar"},{"id":"sp-2","url":"https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?auto=format&fit=crop&q=80&w=400","caption":"Main LT switchgear panel room","type":"DURING","uploadedAt":"2026-08-14","uploadedBy":"Rajesh Kumar"}]', 'Highly recommended for 100 kW grid-tied installation. Estimated monthly generation: 13,500 units saving ~₹1,14,000/mo.')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);

-- Pushing system ACL config
INSERT INTO `solar_acl_config` (`id`, `config_json`)
VALUES ('master_acl_config', '{"Admin":{"crm.leads.view":true,"crm.leads.manage":true,"crm.quotations.create":true,"crm.quotations.approve":true,"projects.view":true,"projects.create":true,"projects.edit_specs":true,"projects.assign_team":true,"projects.stage_checklist":true,"projects.stage_photos":true,"projects.stage_approve":true,"survey.view":true,"survey.submit":true,"survey.approve":true,"inventory.view":true,"inventory.manage":true,"inventory.bom_edit":true,"inventory.purchase_orders":true,"inventory.warehouses_manage":true,"finance.view":true,"finance.invoices":true,"finance.receipts":true,"finance.tally_sync":true,"finance.audit":true,"hrms.view":true,"hrms.attendance_punch":true,"hrms.manage":true,"hrms.payroll":true,"service.tickets_view":true,"service.tickets_create":true,"service.tickets_resolve":true,"service.amc_manage":true,"reports.view":true,"reports.export":true,"settings.view":true,"settings.manage":true,"settings.acl_manage":true},"Project Manager":{"crm.leads.view":true,"crm.leads.manage":false,"crm.quotations.create":true,"crm.quotations.approve":false,"projects.view":true,"projects.create":true,"projects.edit_specs":true,"projects.assign_team":true,"projects.stage_checklist":true,"projects.stage_photos":true,"projects.stage_approve":true,"survey.view":true,"survey.submit":false,"survey.approve":true,"inventory.view":true,"inventory.manage":false,"inventory.bom_edit":true,"inventory.purchase_orders":true,"inventory.warehouses_manage":false,"finance.view":true,"finance.invoices":false,"finance.receipts":false,"finance.tally_sync":false,"finance.audit":false,"hrms.view":true,"hrms.attendance_punch":true,"hrms.manage":false,"hrms.payroll":false,"service.tickets_view":true,"service.tickets_create":true,"service.tickets_resolve":false,"service.amc_manage":false,"reports.view":true,"reports.export":true,"settings.view":true,"settings.manage":false,"settings.acl_manage":false},"Site Survey Engineer":{"crm.leads.view":true,"crm.leads.manage":false,"crm.quotations.create":false,"crm.quotations.approve":false,"projects.view":true,"projects.create":false,"projects.edit_specs":false,"projects.assign_team":false,"projects.stage_checklist":true,"projects.stage_photos":true,"projects.stage_approve":false,"survey.view":true,"survey.submit":true,"survey.approve":false,"inventory.view":false,"inventory.manage":false,"inventory.bom_edit":false,"inventory.purchase_orders":false,"inventory.warehouses_manage":false,"finance.view":false,"finance.invoices":false,"finance.receipts":false,"finance.tally_sync":false,"finance.audit":false,"hrms.view":false,"hrms.attendance_punch":true,"hrms.manage":false,"hrms.payroll":false,"service.tickets_view":false,"service.tickets_create":false,"service.tickets_resolve":false,"service.amc_manage":false,"reports.view":false,"reports.export":false,"settings.view":true,"settings.manage":false,"settings.acl_manage":false},"Site Inspector":{"crm.leads.view":false,"crm.leads.manage":false,"crm.quotations.create":false,"crm.quotations.approve":false,"projects.view":true,"projects.create":false,"projects.edit_specs":false,"projects.assign_team":false,"projects.stage_checklist":true,"projects.stage_photos":true,"projects.stage_approve":false,"survey.view":true,"survey.submit":true,"survey.approve":false,"inventory.view":false,"inventory.manage":false,"inventory.bom_edit":false,"inventory.purchase_orders":false,"inventory.warehouses_manage":false,"finance.view":false,"finance.invoices":false,"finance.receipts":false,"finance.tally_sync":false,"finance.audit":false,"hrms.view":false,"hrms.attendance_punch":true,"hrms.manage":false,"hrms.payroll":false,"service.tickets_view":true,"service.tickets_create":false,"service.tickets_resolve":true,"service.amc_manage":false,"reports.view":false,"reports.export":false,"settings.view":true,"settings.manage":false,"settings.acl_manage":false},"Sales Manager":{"crm.leads.view":true,"crm.leads.manage":true,"crm.quotations.create":true,"crm.quotations.approve":true,"projects.view":true,"projects.create":false,"projects.edit_specs":false,"projects.assign_team":false,"projects.stage_checklist":false,"projects.stage_photos":false,"projects.stage_approve":false,"survey.view":true,"survey.submit":false,"survey.approve":false,"inventory.view":true,"inventory.manage":false,"inventory.bom_edit":false,"inventory.purchase_orders":false,"inventory.warehouses_manage":false,"finance.view":true,"finance.invoices":false,"finance.receipts":false,"finance.tally_sync":false,"finance.audit":false,"hrms.view":true,"hrms.attendance_punch":true,"hrms.manage":false,"hrms.payroll":false,"service.tickets_view":false,"service.tickets_create":false,"service.tickets_resolve":false,"service.amc_manage":false,"reports.view":true,"reports.export":true,"settings.view":true,"settings.manage":false,"settings.acl_manage":false},"Sales Executive":{"crm.leads.view":true,"crm.leads.manage":true,"crm.quotations.create":true,"crm.quotations.approve":false,"projects.view":true,"projects.create":false,"projects.edit_specs":false,"projects.assign_team":false,"projects.stage_checklist":false,"projects.stage_photos":false,"projects.stage_approve":false,"survey.view":true,"survey.submit":false,"survey.approve":false,"inventory.view":true,"inventory.manage":false,"inventory.bom_edit":false,"inventory.purchase_orders":false,"inventory.warehouses_manage":false,"finance.view":false,"finance.invoices":false,"finance.receipts":false,"finance.tally_sync":false,"finance.audit":false,"hrms.view":false,"hrms.attendance_punch":true,"hrms.manage":false,"hrms.payroll":false,"service.tickets_view":false,"service.tickets_create":false,"service.tickets_resolve":false,"service.amc_manage":false,"reports.view":false,"reports.export":false,"settings.view":true,"settings.manage":false,"settings.acl_manage":false},"Civil Team":{"crm.leads.view":false,"crm.leads.manage":false,"crm.quotations.create":false,"crm.quotations.approve":false,"projects.view":true,"projects.create":false,"projects.edit_specs":false,"projects.assign_team":false,"projects.stage_checklist":true,"projects.stage_photos":true,"projects.stage_approve":false,"survey.view":false,"survey.submit":false,"survey.approve":false,"inventory.view":true,"inventory.manage":false,"inventory.bom_edit":false,"inventory.purchase_orders":false,"inventory.warehouses_manage":false,"finance.view":false,"finance.invoices":false,"finance.receipts":false,"finance.tally_sync":false,"finance.audit":false,"hrms.view":false,"hrms.attendance_punch":true,"hrms.manage":false,"hrms.payroll":false,"service.tickets_view":false,"service.tickets_create":false,"service.tickets_resolve":false,"service.amc_manage":false,"reports.view":false,"reports.export":false,"settings.view":true,"settings.manage":false,"settings.acl_manage":false},"Structure Team":{"crm.leads.view":false,"crm.leads.manage":false,"crm.quotations.create":false,"crm.quotations.approve":false,"projects.view":true,"projects.create":false,"projects.edit_specs":false,"projects.assign_team":false,"projects.stage_checklist":true,"projects.stage_photos":true,"projects.stage_approve":false,"survey.view":false,"survey.submit":false,"survey.approve":false,"inventory.view":true,"inventory.manage":false,"inventory.bom_edit":false,"inventory.purchase_orders":false,"inventory.warehouses_manage":false,"finance.view":false,"finance.invoices":false,"finance.receipts":false,"finance.tally_sync":false,"finance.audit":false,"hrms.view":false,"hrms.attendance_punch":true,"hrms.manage":false,"hrms.payroll":false,"service.tickets_view":false,"service.tickets_create":false,"service.tickets_resolve":false,"service.amc_manage":false,"reports.view":false,"reports.export":false,"settings.view":true,"settings.manage":false,"settings.acl_manage":false},"Installation Team":{"crm.leads.view":false,"crm.leads.manage":false,"crm.quotations.create":false,"crm.quotations.approve":false,"projects.view":true,"projects.create":false,"projects.edit_specs":false,"projects.assign_team":false,"projects.stage_checklist":true,"projects.stage_photos":true,"projects.stage_approve":false,"survey.view":false,"survey.submit":false,"survey.approve":false,"inventory.view":true,"inventory.manage":false,"inventory.bom_edit":false,"inventory.purchase_orders":false,"inventory.warehouses_manage":false,"finance.view":false,"finance.invoices":false,"finance.receipts":false,"finance.tally_sync":false,"finance.audit":false,"hrms.view":false,"hrms.attendance_punch":true,"hrms.manage":false,"hrms.payroll":false,"service.tickets_view":false,"service.tickets_create":false,"service.tickets_resolve":false,"service.amc_manage":false,"reports.view":false,"reports.export":false,"settings.view":true,"settings.manage":false,"settings.acl_manage":false},"Electrical Team":{"crm.leads.view":false,"crm.leads.manage":false,"crm.quotations.create":false,"crm.quotations.approve":false,"projects.view":true,"projects.create":false,"projects.edit_specs":false,"projects.assign_team":false,"projects.stage_checklist":true,"projects.stage_photos":true,"projects.stage_approve":false,"survey.view":false,"survey.submit":false,"survey.approve":false,"inventory.view":true,"inventory.manage":false,"inventory.bom_edit":false,"inventory.purchase_orders":false,"inventory.warehouses_manage":false,"finance.view":false,"finance.invoices":false,"finance.receipts":false,"finance.tally_sync":false,"finance.audit":false,"hrms.view":false,"hrms.attendance_punch":true,"hrms.manage":false,"hrms.payroll":false,"service.tickets_view":false,"service.tickets_create":false,"service.tickets_resolve":false,"service.amc_manage":false,"reports.view":false,"reports.export":false,"settings.view":true,"settings.manage":false,"settings.acl_manage":false},"Technician":{"crm.leads.view":false,"crm.leads.manage":false,"crm.quotations.create":false,"crm.quotations.approve":false,"projects.view":true,"projects.create":false,"projects.edit_specs":false,"projects.assign_team":false,"projects.stage_checklist":true,"projects.stage_photos":true,"projects.stage_approve":false,"survey.view":false,"survey.submit":false,"survey.approve":false,"inventory.view":true,"inventory.manage":false,"inventory.bom_edit":false,"inventory.purchase_orders":false,"inventory.warehouses_manage":false,"finance.view":false,"finance.invoices":false,"finance.receipts":false,"finance.tally_sync":false,"finance.audit":false,"hrms.view":false,"hrms.attendance_punch":true,"hrms.manage":false,"hrms.payroll":false,"service.tickets_view":true,"service.tickets_create":false,"service.tickets_resolve":true,"service.amc_manage":false,"reports.view":false,"reports.export":false,"settings.view":true,"settings.manage":false,"settings.acl_manage":false},"Service Manager":{"crm.leads.view":false,"crm.leads.manage":false,"crm.quotations.create":false,"crm.quotations.approve":false,"projects.view":true,"projects.create":false,"projects.edit_specs":false,"projects.assign_team":false,"projects.stage_checklist":false,"projects.stage_photos":false,"projects.stage_approve":false,"survey.view":false,"survey.submit":false,"survey.approve":false,"inventory.view":true,"inventory.manage":false,"inventory.bom_edit":false,"inventory.purchase_orders":false,"inventory.warehouses_manage":false,"finance.view":false,"finance.invoices":false,"finance.receipts":false,"finance.tally_sync":false,"finance.audit":false,"hrms.view":true,"hrms.attendance_punch":true,"hrms.manage":false,"hrms.payroll":false,"service.tickets_view":true,"service.tickets_create":true,"service.tickets_resolve":true,"service.amc_manage":true,"reports.view":true,"reports.export":true,"settings.view":true,"settings.manage":false,"settings.acl_manage":false},"Accountant":{"crm.leads.view":true,"crm.leads.manage":false,"crm.quotations.create":false,"crm.quotations.approve":false,"projects.view":true,"projects.create":false,"projects.edit_specs":false,"projects.assign_team":false,"projects.stage_checklist":false,"projects.stage_photos":false,"projects.stage_approve":false,"survey.view":false,"survey.submit":false,"survey.approve":false,"inventory.view":true,"inventory.manage":false,"inventory.bom_edit":false,"inventory.purchase_orders":true,"inventory.warehouses_manage":false,"finance.view":true,"finance.invoices":true,"finance.receipts":true,"finance.tally_sync":true,"finance.audit":true,"hrms.view":true,"hrms.attendance_punch":true,"hrms.manage":false,"hrms.payroll":true,"service.tickets_view":false,"service.tickets_create":false,"service.tickets_resolve":false,"service.amc_manage":false,"reports.view":true,"reports.export":true,"settings.view":true,"settings.manage":false,"settings.acl_manage":false},"HR Manager":{"crm.leads.view":false,"crm.leads.manage":false,"crm.quotations.create":false,"crm.quotations.approve":false,"projects.view":true,"projects.create":false,"projects.edit_specs":false,"projects.assign_team":false,"projects.stage_checklist":false,"projects.stage_photos":false,"projects.stage_approve":false,"survey.view":false,"survey.submit":false,"survey.approve":false,"inventory.view":false,"inventory.manage":false,"inventory.bom_edit":false,"inventory.purchase_orders":false,"inventory.warehouses_manage":false,"finance.view":false,"finance.invoices":false,"finance.receipts":false,"finance.tally_sync":false,"finance.audit":false,"hrms.view":true,"hrms.attendance_punch":true,"hrms.manage":true,"hrms.payroll":true,"service.tickets_view":false,"service.tickets_create":false,"service.tickets_resolve":false,"service.amc_manage":false,"reports.view":true,"reports.export":true,"settings.view":true,"settings.manage":false,"settings.acl_manage":false},"Customer":{"crm.leads.view":false,"crm.leads.manage":false,"crm.quotations.create":false,"crm.quotations.approve":false,"projects.view":true,"projects.create":false,"projects.edit_specs":false,"projects.assign_team":false,"projects.stage_checklist":false,"projects.stage_photos":false,"projects.stage_approve":false,"survey.view":false,"survey.submit":false,"survey.approve":false,"inventory.view":false,"inventory.manage":false,"inventory.bom_edit":false,"inventory.purchase_orders":false,"inventory.warehouses_manage":false,"finance.view":true,"finance.invoices":false,"finance.receipts":false,"finance.tally_sync":false,"finance.audit":false,"hrms.view":false,"hrms.attendance_punch":false,"hrms.manage":false,"hrms.payroll":false,"service.tickets_view":true,"service.tickets_create":true,"service.tickets_resolve":false,"service.amc_manage":false,"reports.view":false,"reports.export":false,"settings.view":false,"settings.manage":false,"settings.acl_manage":false}}')
ON DUPLICATE KEY UPDATE `config_json` = VALUES(`config_json`);

-- Pushing system settings
INSERT INTO `solar_system_settings` (`setting_key`, `setting_value`)
VALUES ('global_settings', '{"companyName":"REJOY SOLAR POWER PVT. LTD","companyAddress":"PLOT NO- 14, STREET NO- 14B, PRAGATI NAGAR, RISALI BHILAI, Chhattisgarh 490006","companyPhone":"+91 98250 12345","companyEmail":"rejoysolarpower@gmail.com","companyGst":"22AAOCR0748K1Z5","logoUrl":"/logo-dark.png","currencySymbol":"₹","taxRatePercent":18,"tallyServerUrl":"","tallyCompany":"Rejoy Solar 2026-27","tallyStatus":"NOT CONFIGURED","whatsAppStatus":"SANDBOX_READY"}')
ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);

SET FOREIGN_KEY_CHECKS = 1;

-- ==========================================================
-- End of SolarPulse Production MySQL Dump
-- ==========================================================