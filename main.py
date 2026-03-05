import sys
from PyQt5.QtWidgets import (
    QApplication, QMainWindow, QTableView, QVBoxLayout, 
    QWidget, QHeaderView, QMessageBox, QStyledItemDelegate,
    QStyle
)
from PyQt5.QtSql import QSqlDatabase, QSqlTableModel
from PyQt5.QtCore import Qt, QDate
from PyQt5.QtGui import QColor, QBrush

from database import init_db
from scheduler import DateCalculator

class MedicationDelegate(QStyledItemDelegate):
    """
    Custom delegate to handle row highlighting for medications due today.
    """
    def __init__(self, parent=None):
        super().__init__(parent)
        self.calculator = DateCalculator()

    def paint(self, painter, option, index):
        # Get the data for the current row
        model = index.model()
        row = index.row()
        
        # Extract start_date and interval_days from the model
        # Column 4 is start_date, Column 5 is interval_days (based on database.py schema)
        start_date_idx = model.index(row, 4)
        interval_idx = model.index(row, 5)
        
        start_date = start_date_idx.data()
        interval = interval_idx.data()
        
        # Check if due today
        is_due = self.calculator.is_taking_today(start_date, interval)
        
        # If due today, highlight the background
        if is_due:
            # Save the original state
            painter.save()
            
            # Draw highlight background
            # Light emerald/green color for "Today"
            highlight_color = QColor(209, 250, 229) # bg-emerald-100
            if option.state & QStyle.State_Selected:
                highlight_color = QColor(167, 243, 208) # Slightly darker if selected
            
            painter.fillRect(option.rect, QBrush(highlight_color))
            
            # Restore state and paint the text normally
            painter.restore()
            
        super().paint(painter, option, index)

class PillTrackApp(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("药提醒 (PillTrack) - Desktop")
        self.resize(800, 500)
        
        # 1. Initialize Database
        init_db()
        
        # 2. Setup Database Connection (Extensible for MySQL/Cloud)
        self.db = QSqlDatabase.addDatabase("QSQLITE")
        self.db.setDatabaseName("pilltrack.db")
        
        # Future migration example (commented out):
        # self.db = QSqlDatabase.addDatabase("QMYSQL")
        # self.db.setHostName("your-cloud-db.com")
        # self.db.setDatabaseName("pilltrack")
        # self.db.setUserName("admin")
        # self.db.setPassword("secret")
        
        if not self.db.open():
            QMessageBox.critical(self, "错误", "无法连接到数据库")
            sys.exit(1)
            
        # 3. Setup UI
        self.central_widget = QWidget()
        self.setCentralWidget(self.central_widget)
        self.layout = QVBoxLayout(self.central_widget)
        
        # 4. Setup Table Model
        self.model = QSqlTableModel(self, self.db)
        self.model.setTable("drugs")
        self.model.setEditStrategy(QSqlTableModel.OnFieldChange) # Direct editing
        
        # Set Headers
        self.model.setHeaderData(0, Qt.Horizontal, "ID")
        self.model.setHeaderData(1, Qt.Horizontal, "药物名称")
        self.model.setHeaderData(2, Qt.Horizontal, "服用时间")
        self.model.setHeaderData(3, Qt.Horizontal, "单次用量")
        self.model.setHeaderData(4, Qt.Horizontal, "起始日期\n(YYYY-MM-DD)")
        self.model.setHeaderData(5, Qt.Horizontal, "间隔天数\n(隔N天)")
        self.model.setHeaderData(6, Qt.Horizontal, "当前库存")
        
        self.model.select()
        
        # 5. Setup Table View
        self.view = QTableView()
        self.view.setModel(self.model)
        
        # Apply custom delegate for highlighting
        self.delegate = MedicationDelegate(self.view)
        self.view.setItemDelegate(self.delegate)
        
        # UI Styling
        self.view.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        self.view.setAlternatingRowColors(True)
        self.view.setSelectionBehavior(QTableView.SelectRows)
        
        self.layout.addWidget(self.view)
        
        # Status Bar Info
        self.statusBar().showMessage("提示：绿色高亮表示今日需服用。双击单元格可直接修改参数。")

if __name__ == "__main__":
    app = QApplication(sys.argv)
    
    # Set Application Style
    app.setStyle("Fusion")
    
    window = PillTrackApp()
    window.show()
    sys.exit(app.exec_())
