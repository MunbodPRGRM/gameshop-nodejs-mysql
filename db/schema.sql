-- 1. ตาราง GameType
CREATE TABLE GameType (
    type_id INT AUTO_INCREMENT PRIMARY KEY,
    type_name VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB;

-- 2. ตาราง Users (เลี่ยง reserved word User)
CREATE TABLE Users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    profile_image VARCHAR(255),
    role ENUM('User', 'Admin') NOT NULL DEFAULT 'User',
    wallet_balance DECIMAL(10, 2) DEFAULT 0.00
) ENGINE=InnoDB;

-- 3. ตาราง Games
CREATE TABLE Games (
    game_id INT AUTO_INCREMENT PRIMARY KEY,
    game_name VARCHAR(255) NOT NULL,
    detail TEXT,
    price DECIMAL(10, 2) NOT NULL,
    release_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    pic_icon VARCHAR(255),
    pic_portrait VARCHAR(255),
    pic_landscape VARCHAR(255),
    vdo_link VARCHAR(255),
    type_id INT NOT NULL,
    sales_count INT DEFAULT 0,

    CONSTRAINT fk_game_type
        FOREIGN KEY (type_id) 
        REFERENCES GameType (type_id) 
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 4. ตาราง DiscountCodes
CREATE TABLE DiscountCodes (
    code_id INT AUTO_INCREMENT PRIMARY KEY,
    code_name VARCHAR(50) NOT NULL UNIQUE,
    discount_value DECIMAL(10, 2) NOT NULL,
    discount_type ENUM('amount','percent') DEFAULT 'amount', -- เพิ่มความยืดหยุ่น
    max_use INT NOT NULL,
    current_use INT DEFAULT 0,
    expire_date DATE
) ENGINE=InnoDB;

-- 5. ตาราง CodeUsage (ผู้ใช้ใช้โค้ดไหนแล้ว)
CREATE TABLE CodeUsage (
    user_id INT NOT NULL,
    code_id INT NOT NULL,
    usage_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (user_id, code_id), 
    
    CONSTRAINT fk_cu_user
        FOREIGN KEY (user_id) 
        REFERENCES Users (user_id) 
        ON DELETE RESTRICT ON UPDATE CASCADE,
    
    CONSTRAINT fk_cu_code
        FOREIGN KEY (code_id) 
        REFERENCES DiscountCodes (code_id) 
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 6. ตาราง Purchases
CREATE TABLE Purchases (
    purchase_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    sub_total DECIMAL(10, 2) NOT NULL,
    discount_amount DECIMAL(10, 2) DEFAULT 0.00,
    total_amount DECIMAL(10, 2) NOT NULL,
    code_id INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status ENUM('สำเร็จ', 'ยกเลิก') DEFAULT 'สำเร็จ', 
    
    CONSTRAINT fk_purchase_user
        FOREIGN KEY (user_id) 
        REFERENCES Users (user_id) 
        ON DELETE RESTRICT ON UPDATE CASCADE,
    
    CONSTRAINT fk_purchase_code
        FOREIGN KEY (code_id) 
        REFERENCES DiscountCodes (code_id) 
        ON DELETE SET NULL ON UPDATE CASCADE 
) ENGINE=InnoDB;

-- 7. ตาราง PurchaseItems
CREATE TABLE PurchaseItems (
    purchase_id INT NOT NULL,
    game_id INT NOT NULL,
    item_price DECIMAL(10, 2) NOT NULL,
    
    PRIMARY KEY (purchase_id, game_id),
    
    CONSTRAINT fk_pi_purchase
        FOREIGN KEY (purchase_id) 
        REFERENCES Purchases (purchase_id) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    
    CONSTRAINT fk_pi_game
        FOREIGN KEY (game_id) 
        REFERENCES Games (game_id) 
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 8. ตาราง UserLibrary
CREATE TABLE UserLibrary (
    user_id INT NOT NULL,
    game_id INT NOT NULL,
    acquired_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    status ENUM('active','removed') DEFAULT 'active', -- เผื่ออนาคตถ้ามี refund
    
    PRIMARY KEY (user_id, game_id), 
    
    CONSTRAINT fk_ul_user
        FOREIGN KEY (user_id) 
        REFERENCES Users (user_id) 
        ON DELETE RESTRICT ON UPDATE CASCADE,
    
    CONSTRAINT fk_ul_game
        FOREIGN KEY (game_id) 
        REFERENCES Games (game_id) 
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 9. ตาราง Transactions (เลี่ยง reserved word)
CREATE TABLE Transactions (
    transaction_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM('เติมเงิน', 'ซื้อเกม') NOT NULL, 
    amount DECIMAL(10, 2) NOT NULL, 
    detail VARCHAR(255),
    transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    purchase_id INT,
    
    CONSTRAINT fk_transaction_user
        FOREIGN KEY (user_id) 
        REFERENCES Users (user_id) 
        ON DELETE RESTRICT ON UPDATE CASCADE,
        
    CONSTRAINT fk_transaction_purchase
        FOREIGN KEY (purchase_id) 
        REFERENCES Purchases (purchase_id) 
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- Starter Data
-- -----------------------------------------------------
INSERT INTO GameType (type_name) VALUES 
('Action'), 
('Adventure'), 
('Role-Playing (RPG)'), 
('Strategy'), 
('Simulation');
