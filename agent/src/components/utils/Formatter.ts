export class DateFormatter {

    formatDate(date: Date, showSeconds: boolean = false): string {
        let month: string | number = (date.getMonth() + 1);
        month = month < 10 ? '0' + month : month;
        let day = date.getDate() < 10 ? '0' + date.getDate() : date.getDate();
        return day + "/" + month + "/" + date.getFullYear() + " " + this.formatHour(date, showSeconds);
    }

    formatHour(date: Date, showSeconds: boolean = false): string {
        const hours = date.getHours();
        let minutes: string | number = date.getMinutes();
        let seconds: string | number = date.getSeconds();
        minutes = minutes < 10 ? '0' + minutes : minutes;
        seconds = seconds < 10 ? '0' + seconds : seconds;
        return hours + ':' + minutes + (showSeconds ? ':' + seconds : '');
    }

}


