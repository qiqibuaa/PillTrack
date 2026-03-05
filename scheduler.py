from datetime import datetime, date

class DateCalculator:
    """
    Date calculation class to determine medication schedules.
    """
    @staticmethod
    def is_taking_today(start_date_str, interval_days):
        """
        Calculates if a drug should be taken today based on the start date and interval.
        
        Args:
            start_date_str (str): The start date in 'YYYY-MM-DD' format.
            interval_days (int): The number of days to skip between doses.
                                (e.g., 2 means every 3 days).
        
        Returns:
            bool: True if it's a medication day, False otherwise.
        """
        try:
            # Parse the start date
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            today = date.today()
            
            # If today is before the start date, no medication
            if today < start_date:
                return False
            
            # Calculate the difference in days
            diff = (today - start_date).days
            
            # The cycle length is interval_days + 1
            # (e.g., skip 2 days means a 3-day cycle)
            cycle = interval_days + 1
            
            return diff % cycle == 0
        except (ValueError, TypeError):
            # Handle invalid date strings or types gracefully
            return False

if __name__ == "__main__":
    # Test cases
    calc = DateCalculator()
    # Start today, interval 2 (every 3 days) -> Should be True
    print(f"Today (Start Today, Interval 2): {calc.is_taking_today(date.today().strftime('%Y-%m-%d'), 2)}")
    # Start yesterday, interval 2 (every 3 days) -> Should be False
    from datetime import timedelta
    yesterday = (date.today() - timedelta(days=1)).strftime('%Y-%m-%d')
    print(f"Today (Start Yesterday, Interval 2): {calc.is_taking_today(yesterday, 2)}")
