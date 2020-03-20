// ==UserScript==
// @name         Hospital Filter
// @namespace    http://cryosis.co/
// @version      0.1
// @description  Enables filters to remove/hide people from the hospital.
// @author       Cryosis
// @match        *.torn.com/hospitalview.php*
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==


$(window).load(function () {

    const ACTIVITY = [
        'offline',
        'idle',
        'online',
        'active'
    ];
    var filters = {
        activity: 'active',
        time: '0h 0m',
        level: 0,
    };

    initialise();

    function update() {
        let playerList = $(".users-list").children();
        $(playerList).each(filterMember);
    }

    /**
     * Hides the child(the current player) based on the supplied filters
     * @param {The index of a child element from the parent class defined with '.member-list'} index
     */
    function filterMember(index) {
        let player = createPlayer(this);

        // Checking the filters
        let show = true;
        let checkboxes = $(".filter-container").find("input[type='checkbox']");
        $(checkboxes).each(function (index) {
            if ($(this).prop('checked')) {
                switch (this.name) {
                    case 'activity':
                        if (filters['activity'] === 'active') // 'active' == Online or Idle
                        {
                            if (player['activity'] === 'offline')
                                show = false;
                        }
                        else if (filters['activity'] !== player['activity'])
                            show = false;
                        break;
                    case 'time':
                        if (compareTime(filters['time'], player['time']))
                            show = false;
                        break;
                    case 'level':
                        if (parseInt(filters[this.name]) < parseInt(player[this.name]))
                            show = false;
                        break;
                }
            }
        });

        if (show)
            $(this).show();
        else
            $(this).hide();
    }

    /**
     * Returns an object with the stats as values (keys are the same as 'filters').
     * @param {the raw data about the player, found under '.player-info'} rawData
     */
    function createPlayer(rawData) {
        let player = {};

        let playerActivityIconID = $(rawData).find("#iconTray").children().attr('id');
        let playerActivity;
        switch (playerActivityIconID) {
            case 'icon1':
                playerActivity = 'online'; break;
            case 'icon2':
                playerActivity = 'offline'; break;
            case 'icon62':
                playerActivity = 'idle'; break;
        }
        player.activity = playerActivity;

        let level = $(rawData).find(".level").text().replace(/\D/g, '');
        player.level = parseInt(level);

        let time = $(rawData).find(".time").text().match(/(\d{1,2}h )?(\d{1,2}m)/g)[0];
        player.time = time;

        return player;
    }

    /**
     * Initiation function to be run at the beginning.
     */
    function initialise() {
        addStyles();
        drawFilterBar();
        setInitialValue();
        $(".filter-button").click();
    }

    /**
     * Creates and draws the filter bar onto the dom
     */
    function drawFilterBar() {
        // Creating the filter bar and adding it to the dom.
        let element = $(`
      <div class="filter-container m-top10">
        <div class="title-gray top-round">Select Filters</div>
  
        <div class="cont-gray p10 bottom-round">
          <button class="torn-btn right filter-button">Filter</button>
        </div>
      </div>`);

        element = addFilterElements(element);
        $(".pagination-wrap").before(element); // <- Adding to the dom.

        // Adding a checkbox listener to disable/enable the filters.
        $('input[type=checkbox]').change(function () {
            $('.filter-button').click();
        });

        // Adding a listbox listener to update when changed.
        $(element).find('select').change(function () {
            if ($(`input[type=checkbox][name=${this.name}]`).prop('checked'))
                $('.filter-button').click();
        });

        // Adding a listener to the filter button.
        $('.filter-button').click(function () {
            let storedFilters = {}
            $("input[type='checkbox']").each(function (index) {
                if ($(this).prop('checked')) {
                    let input;
                    switch (this.name) {
                        case 'activity':
                            filters[this.name] = $(`select[name='activity']`).val();
                            storedFilters[this.name] = $(`select[name='activity']`).val();
                            break;
                        case 'time':
                            input = convertToTime($(`input[type='text'][name='time']`).val());
                            if (input !== null) {
                                filters['time'] = input;
                                storedFilters['time'] = input;
                                $(`input[type='text'][name='time']`).val(input);
                            }
                            else
                                $(`input[type='text'][name='time']`).val('0h 0m');
                            break;
                        case 'level':
                            input = parseInt($(`input[type='text'][name='level']`).val());
                            if (input !== NaN && input >= 0) {
                                filters['level'] = input;
                                storedFilters['level'] = input;
                            }
                            else
                                $(`input[type='text'][name='${this.name}']`).val('');
                            break;
                    }
                }
            });

            GM_setValue('storedFilters', storedFilters)
            update();
        });
    }

    /**
     * Adds the html filters into the html wrapper passed in as argument.
     * @param {The filter box to add the elements to} element
     */
    function addFilterElements(element) {
        // Activity Listbox
        let activityElement = $(`
      <span style="padding-right: 15px">
        <select class="listbox" name="activity"></select>
        <input type="checkbox" name="activity" style="transform:translateY(25%)"/>
      </span>`
        );
        ACTIVITY.forEach(x => {
            $(activityElement).children(".listbox").append(`<option value=${x}>${x[0].toUpperCase() + x.substr(1)}</option>`);
        });
        $(element).children(".cont-gray").append(activityElement);

        // Time + Level Textboxes
        for (let i = 0; i < 2; i++) {
            let filter = Object.keys(filters)[i + 1];
            let filterElement = $(`
          <span style="padding-right: 15px">
            <label>${filter[0].toUpperCase() + filter.substr(1)}:
            <input type="text" name="${filter}" class="textbox" value="${filters[filter]}"/>
            <input type="checkbox" name="${filter}" style="transform:translateY(25%)"/>
            </label>
          </span>
          `);
            $(element).children(".cont-gray").append(filterElement);
        }
        return element
    }

    /**
     * Retrieves the initial values last used out of the cache and sets them
     */
    function setInitialValue() {
        let storedFilters = GM_getValue('storedFilters', {});
        let filterContainer = $(".filter-container")

        for (let filter in storedFilters) {
            let domFilter = $(filterContainer).find(`[name="${filter}"]`);
            domFilter.eq(0).val(storedFilters[filter]);
            domFilter.eq(1).prop('checked', true);
        }
    }

    /**
     * Compares two times, which are strings in 'XXh XXm' format and returns true if T1 > T2.
     * @param {The first time to be compared against} time1 
     * @param {The second time to be compared against} time2 
     */
    function compareTime(time1, time2) {
        let t1 = time1.replace(/[m ]/gi, '').split('h');
        let t2 = time2.replace(/[m ]/gi, '').split('h');
        t1 = t1.map(x => parseInt(x));
        t2 = t2.map(x => parseInt(x));
        if (t1.length === 1) t1.unshift(0);
        if (t2.length === 1) t2.unshift(0);

        if (t1[0] === t2[0])
            return t1[1] > t2[1];
        else return t1[0] > t2[0];
    }

    /**
     * Scrubs the users time input to a correct time value. Returns null if invalid input.
     * @param {The time to be converted} time 
     */
    function convertToTime(time) {
        console.log(time);
        if (/^(\d{1,2}[hm]? ?){1,2}$/.test(time)) {
            time = time.toLowerCase().replace(/[m ]/gi, '')
            time = time.split('h');
            if (time.length == 1) time.unshift('');
            time = time.map(x => x == '' ? '0' : x);
            console.log(time)
            return time.join('h ') + 'm';
        }
        return null;
    }

    function addStyles() {
        GM_addStyle(`
      .textbox {
        padding: 5px;
        border: 1px solid #ccc;
        width: 50px;
        text-align: left;
        height: 16px;
      }
      .listbox {
        padding: 5px;
        border: 1px solid #ccc;
        border-radius: 5px;
        text-align: left;
      }
      `);
    }
})
