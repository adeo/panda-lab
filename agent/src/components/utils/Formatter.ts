import {Vue, Component} from 'vue-property-decorator';

export class DateFormatter {

    formatDate(date: Date): string {
        let hours = date.getHours() < 10 ? '0' + date.getHours() : date.getHours();
        let minutes: string | number = date.getMinutes();
        minutes = minutes < 10 ? '0' + minutes : minutes;
        const strTime = hours + ':' + minutes;
        let month: string | number = (date.getMonth() + 1);
        month = month < 10 ? '0' + month : month;
        let day = date.getDate() < 10 ? '0' + date.getDate() : date.getDate();
        return day + "/" + month + "/" + date.getFullYear() + " " + strTime;
    }

    formatHour(date: Date): string {
        const hours = date.getHours();
        let minutes: string | number = date.getMinutes();
        let second: string | number = date.getSeconds();
        minutes = minutes < 10 ? '0' + minutes : minutes;
        second = second < 10 ? '0' + second : second;
        return hours + ':' + minutes + ':' + second;
    }

}


