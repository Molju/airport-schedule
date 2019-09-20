var date_buttons = document.querySelectorAll(".date-button");
var active_date = 1;
var loading = document.querySelector('.loading');
var header = document.querySelector(".header-bottom");
var header_real_position = window.pageYOffset + header.getBoundingClientRect().top - 32;
var background_code = document.querySelector(".background-airport-code");
var background_code_coef = 100 / header_real_position;
var schedule = document.querySelector(".schedule");
var checkbox = document.querySelector("#delayed");
var schedule_size = 0;
var allow_scroll = true;
var search_input = document.querySelector('#search');
var time_chooser = document.querySelector('.time-button p');
var times_wrapper = document.querySelector('.times-wrapper');
var time_option = document.querySelectorAll('.time');
var type_selector = document.querySelectorAll('.selector-option');

var search_query = {
  "type": "dep",
  "year": new Date().getFullYear(),
  "month": +new Date().getMonth() + 1,
  "day": new Date().getDate(),
  "hour": ""
};
var months = {
  "0": "янв",
  "1": "фев",
  "2": "мар",
  "3": "апр",
  "4": "май",
  "5": "июн",
  "6": "июл",
  "7": "авг",
  "8": "сен",
  "9": "окт",
  "10": "ноя",
  "11": "дек",
}
var statuses = {
  'A': "В полете",
  'U': "Нет данных",
  'R': "Перенаправлен",
  'D': "Приземлился в незапланированном эропорту"
}

//Устанавливаем первоначальный диапазон времени основываясь на текущем времени
if(new Date().getHours() % 2 == 0) {
  time_chooser.textContent = ('0' + new Date().getHours()).slice(-2) + ":00 - " + ('0' + (new Date().getHours() + 2)).slice(-2) + ":00";
  search_query.hour = new Date().getHours();
}
else {
  time_chooser.textContent = ('0' + (new Date().getHours() - 1)).slice(-2) + ":00 - " + ('0' + (new Date().getHours() + 1)).slice(-2) + ":00";
  search_query.hour = new Date().getHours() - 1;
}

//отслеживание скрола для отцепления хедера и анимации кода аэропорта на заднем плане
window.onscroll = function(e) {
  if(!allow_scroll) {
    e.preventDefault();
  }
  if(window.pageYOffset >= header_real_position) {
    if(!header.classList.contains("scrolled")) {
      header.classList.add("scrolled");
    }
    background_code.style.visibility = "hidden";
  }
  else {
    if(header.classList.contains("scrolled")) {
      header.classList.remove("scrolled");
    }
    background_code.style.visibility = "visible";
    if(window.pageYOffset >= 0) {
      background_code.style.transform = "translate(-50%," + (-50 - (window.pageYOffset * background_code_coef / 20)) + "%) rotateX(" + (window.pageYOffset * background_code_coef) + "deg)";
    }
  }
}


document.addEventListener('DOMContentLoaded', function() {
  //Создаем даты для кнопок вчера, сегодня, завтра
  var dates = document.querySelectorAll('.date');
  for(var i=0;i<dates.length;i++) {
    var t = new Date(Date.now() + (3600*24*1000*(i-1)));
    date_buttons[i].dataset.year = t.getFullYear();
    date_buttons[i].dataset.month = t.getMonth() + 1;
    date_buttons[i].dataset.day = t.getDate();
    dates[i].textContent = t.getDate() + " " + months[t.getMonth()];
  }

  //Назначаем событие клика кнопкам переключения дат
  for(var i=0;i<date_buttons.length;i++) (function(i) {
    date_buttons[i].onclick = function() {
      if(!date_buttons[i].classList.contains('active')) {
        //возвращаемся к верху страницы
        if(window.pageYOffset > 0) {
          //параметр, который не позволяет прокручивать страницу во время анимации подъема вверх (используется в событии onscroll далее)
          allow_scroll = false;
          setTimeout(function() {
            $('html, body').animate({ scrollTop: $('header').offset().top }, 600, function() {
              allow_scroll = true;
            });
          },300);
        }
        //переключение даты
        if(!date_buttons[i].classList.contains('active')) {
          date_buttons[active_date].classList.remove("active");
          date_buttons[i].classList.add("active");
          active_date = date_buttons[i].dataset.dateNumber;
        }

        //изменение данных для запроса расписания на новую дату
        search_query.year = date_buttons[i].dataset.year;
        search_query.month = date_buttons[i].dataset.month;
        search_query.day = date_buttons[i].dataset.day;
        //запрос расписания
        loadRasp();
      }
      if(checkbox.checked) {
        checkbox.click();
      }
    }
    })(i);


    //обработчик клика для кнопки времени
    time_chooser.onclick = function() {
      times_wrapper.classList.add('active');
      document.querySelector('.closer').classList.add('active');
    }
    //closer - задний невидимый слой, который позволяет закрыть меню времени щелкнув в любом месте
    document.querySelector('.closer').onclick = function() {
      times_wrapper.classList.remove('active');
      document.querySelector('.closer').classList.remove('active');
    }
    //событие клика на определенное время
    for(var i=0;i<time_option.length;i++) (function(i) {
      time_option[i].onclick = function() {
        //установка выбранного времени в качестве отображаемого
        time_chooser.textContent = ('0' + time_option[i].dataset.time).slice(-2) + ":00 - " + ('0' + (+time_option[i].dataset.time + 2)).slice(-2) + ":00";
        times_wrapper.classList.remove('active');
        document.querySelector('.closer').classList.remove('active');
        //обновление времени для запроса
        search_query.hour = time_option[i].dataset.time;
        //запрос нового расписания
        loadRasp();
      }
    })(i);
  //Проверка нажатия на чекбокс задержек
  checkbox.onchange = search;
  //проверка изменения поля поиска
  search_input.oninput = search;
  //события клика для селектора типа расписания (вылет/прилет)
  for(var i=0;i<type_selector.length;i++) (function(i) {
    type_selector[i].onclick = function() {
      if(!type_selector[i].classList.contains('active')) {
        type_selector[i].classList.add('active');
        if(i == 1) type_selector[0].classList.remove('active');
        else type_selector[1].classList.remove('active');
        //изменение типа запроса
        search_query.type = type_selector[i].dataset.type;
        //если выбрана дата сегодня, то запрос нового расписания, в противном случае переключение на сегодня и запрос расписания
        if(date_buttons[1].classList.contains('active')) loadRasp();
        else date_buttons[1].click();
      }
    }
  })(i);
});
//своя функция для удобного создания элементов
function createElem(type,class_list='',text='') {
  var el = document.createElement(type);
  if(class_list) el.classList = class_list;
  el.innerHTML = text;
  return el;
}
//поиск названия города в полученной data для определенного рейса
function search_city_name(airports,code) {
  for(var i=0;i<airports.length;i++) {
    if(airports[i].fs == code) {
      return airports[i].city;
      break;
    }
  }
}


//удаление элементов расписания из DOM
function destroySchedule() {
  //сохраняем высоту текущего рассписания, чтобы ползунок не сходил с ума при удалении всех элементов расписания, а потом добавления новых, после запроса
  schedule_size = getComputedStyle(schedule).height;
  var flights = document.querySelectorAll('.flight');
  //для плавности, сначала скрываем элементы, а потом удаляем
  for(var j=0;j<flights.length;j++) {
    if(!flights[j].classList.contains('hide')) {
      flights[j].classList.add('hide');
      setTimeout((function() {
        flights[j].remove();//schedule.removeChild(flights[j]);
      })(j),1200)
    }
  }
}
//создание нового расписания (принимает data - ответ API, type - тип запроса вылет/прилет)
function createSchedule(data,type) {
  //чтобы не копировать большой кусок кода отдельно для вылета и прилета, создаем объект, который позволяет использовать нужные значения из data, основываясь на типе запроса
  var dict_low = {
    'arr': "arrival",
    'dep': "departure"
  };
  var dict_upper = {
    'arr': "Arrival",
    'dep': "Departure"
  }
  //сортировка по времени
  function sort_func(dateA, dateB) {
      return Date.parse(dateA[dict_low[type] + "Date"].dateLocal) - Date.parse(dateB[dict_low[type] + "Date"].dateLocal);
  }
  data.flightStatuses.sort(sort_func);

  for(var i=0;i<data.flightStatuses.length;i++) {
    var flight = data.flightStatuses[i];
    //полоска рейса
    var flight_row = createElem('div','flight');
    //время и дата рейса
    var flight_time = createElem('div','flight-time');
    var flight_date = new Date(flight[dict_low[type] + "Date"].dateLocal);
    flight_time.appendChild(createElem('p','',("0" + flight_date.getHours()).slice(-2) + ":" + ("0" + flight_date.getMinutes()).slice(-2)));
    flight_time.appendChild(createElem('p','',flight_date.getDate() + " " + months[flight_date.getMonth()]));
    flight_row.appendChild(flight_time);
    //здесь нужны значения типа наоборот, поэтому не удалось воспользоваться созданным объектом
    //получаем направление
    if(type == 'dep') {
      var direct = createElem('div','flight-direction',search_city_name(data.appendix.airports,flight[dict_low['arr'] + "AirportFsCode"]));
    }
    else {
      var direct = createElem('div','flight-direction',search_city_name(data.appendix.airports,flight[dict_low['dep'] + "AirportFsCode"]));
    }

    flight_row.appendChild(direct);
    //номера рейса
    var flight_numbers = createElem('div','flight-number');
    var flight_num = createElem('p','','<span>' + flight.carrierFsCode + '</span> ' + flight.flightNumber);
    flight_numbers.appendChild(flight_num);
    if(flight.codeshares) {
      for(var j=0;j<flight.codeshares.length;j++) {
        var code = flight.codeshares[j];
        flight_num = createElem('p','','<span>' + code.fsCode + '</span> ' + code.flightNumber);
        flight_numbers.appendChild(flight_num);
      }
    }
    flight_row.appendChild(flight_numbers);

    //проверяем наличие информации о терминале
    if(flight.airportResources) {
      if(flight.airportResources[dict_low[type] + "Terminal"]) flight_row.appendChild(createElem('div','flight-terminal',flight.airportResources[dict_low[type] + "Terminal"]));
      else flight_row.appendChild(createElem('div','flight-terminal','-'));
    }
    else {
      flight_row.appendChild(createElem('div','flight-terminal','-'));
    }

    //проверяем статус
    switch(flight.status) {
      case 'S':
       flight_row.dataset.status = 'S';
       //если есть приблизительное время вылета/прилета
        if(flight.operationalTimes["estimatedGate" + dict_upper[type]]) {
          //если оно больше заявленного
          if(Date.parse(flight.operationalTimes["estimatedGate" + dict_upper[type]].dateLocal) > Date.parse(flight.operationalTimes["scheduledGate" + dict_upper[type]].dateLocal)) {
            //обновляем дату на новую, основываясь на новом времени
            var new_flight_date = new Date(flight.operationalTimes["estimatedGate" + dict_upper[type]].dateLocal);
            flight_time.firstChild.innerHTML = ("0" + new_flight_date.getHours()).slice(-2) + ":" + ("0" + new_flight_date.getMinutes()).slice(-2);
            flight_time.firstChild.style.color = "red";
            //добавляем старую дату слева от новой
            var old_flight_time = createElem('div','old-flight-time');
            old_flight_time.appendChild(createElem('p','',("0" + flight_date.getHours()).slice(-2) + ":" + ("0" + flight_date.getMinutes()).slice(-2)));
            old_flight_time.appendChild(createElem('p','',flight_date.getDate() + " " + months[flight_date.getMonth()]));
            flight_row.insertBefore(old_flight_time,flight_row.firstChild);

            var t = check_status_elem("Задерживается",i,'warn');
            if(t) flight_row.appendChild(createElem('div',t[0],t[1]));
            flight_row.dataset.status = 'delayed';
            /*if(checkbox.checked) flight_row.classList.remove('hidden');*/
          }
          else {
            var t = check_status_elem("Ожидается по плану",i,'');
            if(t) flight_row.appendChild(createElem('div',t[0],t[1]));
          }
        }
        //если нет задержки
        else {
          var t = check_status_elem("Ожидается по плану",i,'');
          if(t) flight_row.appendChild(createElem('div',t[0],t[1]));
        }
        if(flight.operationalTimes.actualGateDeparture) {
          var t = check_status_elem("Идет отправление",i,'');
          if(t) flight_row.appendChild(createElem('div',t[0],t[1]));
        }
        break;


      case 'L':
          if(type == 'dep') {
            var t = check_status_elem('Приземлился в <span>' + direct.innerHTML + '</span>',i,'');
            if(t) flight_row.appendChild(createElem('div',t[0],t[1]));
          }
          else {
            var t = check_status_elem('Совершил посадку',i,'');
            if(t) flight_row.appendChild(createElem('div',t[0],t[1]));
          }
           flight_row.dataset.status = 'L';
           break;

     case 'C':
         var t = check_status_elem('Отменен',i,'warn');
         if(t) flight_row.appendChild(createElem('div',t[0],t[1]));
         flight_row.dataset.status = 'C';
         break;

         //если необычный статус, то ищется в массиве остальных статусов
      default:
        for(var stat in statuses) {
          if(flight.status == stat) {
            var t = check_status_elem(statuses[stat],i,'');
            if(t) flight_row.appendChild(createElem('div',t[0],t[1]));
            flight_row.dataset.status = stat;
            break;
          }
        }
    }
    //добавление к расписанию рейса
    schedule.appendChild(flight_row);
  }
}

//функция, которая манипулирует уже созданным расписанием для вывода задерживающихся и/или найденных с помощью поиска рейсов
function search() {
  if(checkbox.checked) {
    if(search_input.value == '') {
      var fl_normal = document.querySelectorAll('.flight:not([data-status="delayed"])');
      var fl_delayed = document.querySelectorAll('.flight[data-status="delayed"]');
      for(var i=0;i<Math.max(fl_normal.length,fl_delayed.length);i++) {
        if(fl_normal[i]) fl_normal[i].classList.add('hidden');
        if(fl_delayed[i]) fl_delayed[i].classList.remove('hidden');
      }
      if(!document.querySelectorAll(".flight:not(.hidden)").length) document.querySelector('.status').classList.add('active');
      else document.querySelector('.status').classList.remove('active');
    }
    else {
      var fl_normal = document.querySelectorAll('.flight:not([data-status="delayed"])');
      var fl_delayed = document.querySelectorAll('.flight[data-status="delayed"]');
      var numbers = document.querySelectorAll('.flight[data-status="delayed"] .flight-number');
      for(var i=0;i<Math.max(fl_normal.length,fl_delayed.length);i++) {
        if(fl_normal[i]) fl_normal[i].classList.add('hidden');
        if(fl_delayed[i]) {
          for(var j=0;j<numbers[i].children.length;j++) {
            if(numbers[i].children[j].textContent.includes(search_input.value.toUpperCase()) && j <= (numbers[i].children.length - 1)) {
              fl_delayed[i].classList.remove('hidden');
              break;
            }
            if(!numbers[i].children[j].textContent.includes(search_input.value.toUpperCase()) && j == (numbers[i].children.length - 1)) {
              fl_delayed[i].classList.add('hidden');
            }
          }
        }
      }
      if(!document.querySelectorAll(".flight:not(.hidden)").length) document.querySelector('.status').classList.add('active');
      else document.querySelector('.status').classList.remove('active');
    }
  }
  else {
    if(search_input.value == '') {
      var fl = document.querySelectorAll('.flight');
      for(var i=0;i<fl.length;i++) fl[i].classList.remove('hidden');
      if(!document.querySelectorAll(".flight:not(.hidden)").length) document.querySelector('.status').classList.add('active');
      else document.querySelector('.status').classList.remove('active');
    }
    else {
      var fl = document.querySelectorAll('.flight');
      var numbers = document.querySelectorAll('.flight .flight-number');
      for(var i=0;i<fl.length;i++) {
          for(var j=0;j<numbers[i].children.length;j++) {

            if(numbers[i].children[j].textContent.includes(search_input.value.toUpperCase()) && j <= (numbers[i].children.length - 1)) {
              fl[i].classList.remove('hidden');
              break;
            }
            if(!numbers[i].children[j].textContent.includes(search_input.value.toUpperCase()) && j == (numbers[i].children.length - 1)) {
              fl[i].classList.add('hidden');
            }
          }
      }
      if(!document.querySelectorAll(".flight:not(.hidden)").length) document.querySelector('.status').classList.add('active');
      else document.querySelector('.status').classList.remove('active');
    }
  }
  if(window.pageYOffset > 0) {
    allow_scroll = false;
    setTimeout(function() {
      $('html, body').animate({ scrollTop: $('header').offset().top }, 600, function() {
        allow_scroll = true;
      });
    },300);
  }
}

window.addEventListener("message", function(origin,source,data) {
  console.log("Пришло");
});

//делает запрос к API и обновляет расписание
function loadRasp() {
  if(document.querySelectorAll('.flight:not(.hidden)').length) schedule.style.minHeight = schedule_size;
  destroySchedule();
  loading.classList.remove('hidden');

  let temp_day = new Date().getDate();
  if(search_query.day < temp_day) temp_day = "departure0.json";
  if(search_query.day == temp_day) temp_day = "departure1.json";
  if(search_query.day > temp_day) temp_day = "departure2.json";

  jQuery.ajax({
   url:  temp_day ,
   type: "GET",
   dataType: "json",
   async: "true",
   success: function(data) {
     //console.log(data);
     loading.classList.add('hidden');
     setTimeout(function() {
       createSchedule(data,search_query.type);
       search();

       var flights = document.querySelectorAll('.flight');
       for (let i=0;i<flights.length;i++) {
         flights[i].onclick = function() {
           if(flights[i].classList.contains('full')) flights[i].classList.remove('full');
           else flights[i].classList.add('full');
         }
       }
       schedule.style.minHeight = 'auto';
     },200);

   }
 });
  /*
  jQuery.ajax({
   url:  "https://api.flightstats.com/flex/flightstatus/rest/v2/jsonp/airport/status/SVO/" + search_query.type + "/" + search_query.year + "/" + search_query.month + "/" + search_query.day + "/" + search_query.hour + "?appId=f52c6a37&appKey=432daba63da7bce6095aaf1c2a7ec553&utc=false&numHours=2&codeType=IATA", //"/departure1.json" ,
   type: "GET",
   crossDomain: true,
   dataType: "jsonp",
   async: "true",
   success: function(data) {
     //console.log(data);
     loading.classList.add('hidden');
     setTimeout(function() {
       createSchedule(data,search_query.type);
       search();
       schedule.style.minHeight = 'auto';
     },200);

   }
 });*/
}
//Первая загрузка расписания
loadRasp();


function check_status_elem(stat,index,warn) {
  var flight_status = document.querySelectorAll('.flight-status')[index];
  if(flight_status) {
    flight_status.innerHTML = stat;
    if(flight_status.classList.contains('warn')) {
      if(!warn) flight_status.classList.remove('warn');
      return '';
    }
    else {
      if(warn) flight_status.classList.add('warn');
      return '';
    }
  }
  else {
    return ['flight-status ' + warn,stat];
  }
}
